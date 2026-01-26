import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Search, Plus, Edit2, Trash2, X, Eye, EyeOff, BarChart3, TrendingUp, Shield, LogOut, ArrowLeft, DollarSign } from 'lucide-react';
import { Card, Button, Badge } from '../components/UIComponents';
import { api } from '../services/apiClient';

type View = 'DASHBOARD' | 'USERS' | 'AUDIT_LOGS';

interface User {
   id: number;
   email: string;
   role: string;
   name: string;
   phone: string;
   is_active: boolean;
   is_verified: boolean;
   created_at: string;
}

export const SuperAdminPortal = ({ onBack }: { onBack: () => void }) => {
   const [activeView, setActiveView] = useState<View>('DASHBOARD');
   const [stats, setStats] = useState<any>(null);
   const [users, setUsers] = useState<User[]>([]);
   const [auditLogs, setAuditLogs] = useState<any[]>([]);
   const [isLoading, setIsLoading] = useState(false);
   const [searchTerm, setSearchTerm] = useState('');
   const [roleFilter, setRoleFilter] = useState('');

   // Modal states
   const [showUserModal, setShowUserModal] = useState(false);
   const [editingUser, setEditingUser] = useState<User | null>(null);
   const [showPassword, setShowPassword] = useState(false);
   const [formData, setFormData] = useState({
      email: '',
      password: '',
      role: 'PATIENT',
      name: '',
      phone: '',
      specialization: '',
      consultationFee: '1000'
   });

   useEffect(() => {
      fetchStats();
   }, []);

   useEffect(() => {
      if (activeView === 'USERS') {
         fetchUsers();
      } else if (activeView === 'AUDIT_LOGS') {
         fetchAuditLogs();
      }
   }, [activeView, searchTerm, roleFilter]);

   const fetchStats = async () => {
      try {
         const data = await api.getSystemStats();
         setStats(data);
      } catch (err) {
         console.error('Error fetching stats:', err);
      }
   };

   const fetchUsers = async () => {
      try {
         setIsLoading(true);
         const data = await api.getSuperAdminUsers({ search: searchTerm, role: roleFilter });
         console.log('📊 Users received from API:', data.users);
         console.log('📊 First user example:', data.users?.[0]);
         setUsers(data.users || []);
      } catch (err) {
         console.error('Error fetching users:', err);
      } finally {
         setIsLoading(false);
      }
   };

   const fetchAuditLogs = async () => {
      try {
         setIsLoading(true);
         const data = await api.getAuditLogs({ entity_type: 'user', limit: 100 });
         setAuditLogs(data.logs || []);
      } catch (err) {
         console.error('Error fetching audit logs:', err);
      } finally {
         setIsLoading(false);
      }
   };

   const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
         await api.createSuperAdminUser({
            ...formData,
            consultationFee: formData.role === 'DOCTOR' ? parseFloat(formData.consultationFee) : undefined
         });
         setShowUserModal(false);
         resetForm();
         fetchUsers();
         fetchAuditLogs();
      } catch (err: any) {
         alert(err.response?.data?.message || 'Failed to create user');
      }
   };

   const handleUpdateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;

      try {
         await api.updateSuperAdminUser(editingUser.id, {
            email: formData.email,
            name: formData.name,
            phone: formData.phone
         });
         setShowUserModal(false);
         setEditingUser(null);
         resetForm();
         fetchUsers();
         fetchAuditLogs();
      } catch (err: any) {
         alert(err.response?.data?.message || 'Failed to update user');
      }
   };

   const handleDeleteUser = async (userId: number) => {
      if (!confirm('Are you sure you want to delete this user?')) return;

      try {
         await api.deleteSuperAdminUser(userId);
         fetchUsers();
         fetchAuditLogs();
      } catch (err: any) {
         alert(err.response?.data?.message || 'Failed to delete user');
      }
   };

   const openCreateModal = () => {
      resetForm();
      setEditingUser(null);
      setShowUserModal(true);
   };

   const openEditModal = (user: User) => {
      setFormData({
         email: user.email,
         password: '',
         role: user.role,
         name: user.name,
         phone: user.phone || '',
         specialization: '',
         consultationFee: '1000'
      });
      setEditingUser(user);
      setShowUserModal(true);
   };

   const resetForm = () => {
      setFormData({
         email: '',
         password: '',
         role: 'PATIENT',
         name: '',
         phone: '',
         specialization: '',
         consultationFee: '1000'
      });
   };

   const getActionColor = (actionType: string) => {
      switch (actionType) {
         case 'CREATE': return 'blue';
         case 'UPDATE': return 'yellow';
         case 'DELETE': return 'red';
         default: return 'gray';
      }
   };

   // Calculate audit chart data
   const getAuditChartData = () => {
      const actionCounts = auditLogs.reduce((acc: any, log) => {
         acc[log.action_type] = (acc[log.action_type] || 0) + 1;
         return acc;
      }, {});

      return Object.entries(actionCounts).map(([action, count]) => ({
         action,
         count,
         percentage: ((count as number) / auditLogs.length * 100).toFixed(1)
      }));
   };

   const chartData = auditLogs.length > 0 ? getAuditChartData() : [];

   // Sidebar Menu Item Component matching AdminPortal
   const MenuItem = ({ view, icon, label }: { view: View, icon: React.ReactNode, label: string }) => (
      <button
         onClick={() => setActiveView(view)}
         className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeView === view
            ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
      >
         {icon} {label}
      </button>
   );

   return (
      <div className="flex min-h-screen bg-slate-50 font-sans">
         {/* SIDEBAR - Matching AdminPortal Design */}
         <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0">
            {/* Sidebar Header */}
            <div className="p-6 border-b border-slate-100">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                     <Shield size={24} />
                  </div>
                  <div>
                     <h3 className="font-bold text-slate-900 text-sm font-heading">Super Admin</h3>
                     <p className="text-xs text-slate-500 font-medium">System Control</p>
                  </div>
               </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
               <MenuItem view="DASHBOARD" icon={<LayoutDashboard size={18} />} label="Dashboard" />
               <MenuItem view="USERS" icon={<Users size={18} />} label="User Management" />
               <MenuItem view="AUDIT_LOGS" icon={<FileText size={18} />} label="Analytics & Logs" />
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-slate-100">
               <button
                  onClick={onBack}
                  className="flex items-center gap-2 text-red-600 font-medium hover:bg-red-50 p-3 rounded-lg w-full transition-colors justify-center"
               >
                  <LogOut size={18} /> Logout
               </button>
            </div>
         </aside>

         {/* MAIN CONTENT AREA */}
         <main className="flex-1 overflow-auto">
            <div className="p-8">
               {/* Dashboard View */}
               {activeView === 'DASHBOARD' && (
                  <div className="space-y-6 animate-fade-in">
                     <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
                        <p className="text-slate-500">System overview and statistics</p>
                     </div>

                     {stats && (
                        <>
                           {/* User Stats Grid */}
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {stats.users?.map((userStat: any, index: number) => {
                                 const colors = [
                                    'from-blue-500 to-blue-600',
                                    'from-emerald-500 to-emerald-600',
                                    'from-purple-500 to-purple-600',
                                    'from-amber-500 to-amber-600'
                                 ];
                                 return (
                                    <Card key={userStat.role} className={`bg-gradient-to-br ${colors[index % 4]} text-white border-0 shadow-lg`}>
                                       <p className="text-white/80 text-xs font-medium uppercase tracking-wide mb-1">{userStat.role}</p>
                                       <h2 className="text-4xl font-bold mb-2">{userStat.count}</h2>
                                       <div className="flex items-center gap-1 text-sm text-white/90">
                                          <TrendingUp size={14} />
                                          <span>{userStat.active_count} active</span>
                                       </div>
                                    </Card>
                                 );
                              })}
                           </div>

                           {/* System Stats */}
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <Card className="hover:shadow-md transition-shadow bg-white">
                                 <p className="text-slate-500 text-sm font-medium mb-1">Total Appointments</p>
                                 <h2 className="text-3xl font-bold text-slate-900">{stats.database?.total_appointments?.toLocaleString()}</h2>
                              </Card>
                              <Card className="hover:shadow-md transition-shadow bg-white">
                                 <p className="text-slate-500 text-sm font-medium mb-1">Recent Logins (24h)</p>
                                 <h2 className="text-3xl font-bold text-emerald-600">{stats.recentLogins}</h2>
                              </Card>
                              <Card className="hover:shadow-md transition-shadow bg-white">
                                 <p className="text-slate-500 text-sm font-medium mb-1">Audit Log Entries</p>
                                 <h2 className="text-3xl font-bold text-slate-900">{stats.database?.total_audit_logs?.toLocaleString()}</h2>
                              </Card>
                           </div>

                           {/* Today's Activity */}
                           {stats.todayActivity && stats.todayActivity.length > 0 && (
                              <Card className="hover:shadow-md transition-shadow bg-white">
                                 <h3 className="text-lg font-bold text-slate-900 mb-4">Today's Activity</h3>
                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {stats.todayActivity.map((activity: any) => (
                                       <div key={activity.action_type} className="text-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200">
                                          <p className="text-2xl font-bold text-slate-900 mb-1">{activity.count}</p>
                                          <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">{activity.action_type}</p>
                                       </div>
                                    ))}
                                 </div>
                              </Card>
                           )}
                        </>
                     )}
                  </div>
               )}

               {/* Users View */}
               {activeView === 'USERS' && (
                  <div className="space-y-6 animate-fade-in">
                     <div className="flex justify-between items-center">
                        <div>
                           <h1 className="text-3xl font-bold text-slate-900 mb-2">User Management</h1>
                           <p className="text-slate-500">Create, edit, and manage system users</p>
                        </div>
                        <Button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg">
                           <Plus size={18} /> Add New User
                        </Button>
                     </div>

                     <Card className="shadow-lg bg-white">
                        <div className="flex gap-3 mb-6">
                           <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                              <input
                                 type="text"
                                 placeholder="Search by email or name..."
                                 value={searchTerm}
                                 onChange={(e) => setSearchTerm(e.target.value)}
                                 className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                           </div>
                           <select
                              value={roleFilter}
                              onChange={(e) => setRoleFilter(e.target.value)}
                              className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                           >
                              <option value="">All Roles</option>
                              <option value="PATIENT">Patient</option>
                              <option value="DOCTOR">Doctor</option>
                              <option value="HOSPITAL_ADMIN">Hospital Admin</option>
                              <option value="SUPER_ADMIN">Super Admin</option>
                           </select>
                        </div>

                        {isLoading ? (
                           <div className="text-center py-16">
                              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                              <p className="text-slate-500 mt-4">Loading users...</p>
                           </div>
                        ) : users.length === 0 ? (
                           <div className="text-center py-16">
                              <Users className="mx-auto mb-4 text-slate-300" size={64} />
                              <p className="text-slate-500 text-lg">No users found</p>
                           </div>
                        ) : (
                           <div className="overflow-x-auto">
                              <table className="w-full">
                                 <thead className="bg-slate-50 border-b-2 border-slate-200">
                                    <tr>
                                       <th className="p-4 text-left text-sm font-semibold text-slate-700">Name</th>
                                       <th className="p-4 text-left text-sm font-semibold text-slate-700">Email</th>
                                       <th className="p-4 text-left text-sm font-semibold text-slate-700">Role</th>
                                       <th className="p-4 text-left text-sm font-semibold text-slate-700">Phone</th>
                                       <th className="p-4 text-left text-sm font-semibold text-slate-700">Status</th>
                                       <th className="p-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {users.map((user) => (
                                       <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                          <td className="p-4 font-medium text-slate-900">{user.name || user.email}</td>
                                          <td className="p-4 text-slate-600">{user.email}</td>
                                          <td className="p-4">
                                             <Badge color={user.role === 'SUPER_ADMIN' ? 'purple' : 'blue'}>
                                                {user.role}
                                             </Badge>
                                          </td>
                                          <td className="p-4 text-slate-600">{user.phone || '-'}</td>
                                          <td className="p-4">
                                             <Badge color={user.is_active ? 'green' : 'red'}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                             </Badge>
                                          </td>
                                          <td className="p-4">
                                             <div className="flex gap-2">
                                                <button
                                                   onClick={() => openEditModal(user)}
                                                   className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                   <Edit2 size={16} />
                                                </button>
                                                <button
                                                   onClick={() => handleDeleteUser(user.id)}
                                                   className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                   <Trash2 size={16} />
                                                </button>
                                             </div>
                                          </td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        )}
                     </Card>
                  </div>
               )}

               {/* Audit Logs & Analytics View */}
               {activeView === 'AUDIT_LOGS' && (
                  <div className="space-y-6 animate-fade-in">
                     <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Business Analytics & Audit Logs</h1>
                        <p className="text-slate-500">Revenue metrics, business intelligence, and system activity</p>
                     </div>

                     {/* Revenue & Business Metrics */}
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
                           <p className="text-white/80 text-xs font-medium uppercase tracking-wide mb-1">Total Revenue</p>
                           <h2 className="text-3xl font-bold mb-1">৳12.5M</h2>
                           <p className="text-sm text-white/90">+15.3% from last month</p>
                        </Card>
                        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                           <p className="text-white/80 text-xs font-medium uppercase tracking-wide mb-1">Active Subscriptions</p>
                           <h2 className="text-3xl font-bold mb-1">2,847</h2>
                           <p className="text-sm text-white/90">+8.2% growth</p>
                        </Card>
                        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
                           <p className="text-white/80 text-xs font-medium uppercase tracking-wide mb-1">Avg Transaction</p>
                           <h2 className="text-3xl font-bold mb-1">৳4,387</h2>
                           <p className="text-sm text-white/90">Per appointment</p>
                        </Card>
                        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg">
                           <p className="text-white/80 text-xs font-medium uppercase tracking-wide mb-1">Monthly Growth</p>
                           <h2 className="text-3xl font-bold mb-1">23.4%</h2>
                           <p className="text-sm text-white/90">Year over year</p>
                        </Card>
                     </div>

                     {/* Revenue Chart & Business Type Distribution */}
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Revenue Trend */}
                        <Card className="shadow-lg bg-white">
                           <h3 className="text-lg font-bold text-slate-900 mb-4">Revenue Trend (Last 7 Days)</h3>
                           <div className="space-y-3">
                              {[
                                 { day: 'Mon', revenue: 145000, percentage: 65 },
                                 { day: 'Tue', revenue: 168000, percentage: 75 },
                                 { day: 'Wed', revenue: 192000, percentage: 85 },
                                 { day: 'Thu', revenue: 178000, percentage: 80 },
                                 { day: 'Fri', revenue: 215000, percentage: 95 },
                                 { day: 'Sat', revenue: 235000, percentage: 100 },
                                 { day: 'Sun', revenue: 198000, percentage: 88 }
                              ].map((item) => (
                                 <div key={item.day}>
                                    <div className="flex justify-between mb-1">
                                       <span className="text-sm font-semibold text-slate-700">{item.day}</span>
                                       <span className="text-sm font-medium text-emerald-600">৳{item.revenue.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-3">
                                       <div
                                          className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
                                          style={{ width: `${item.percentage}%` }}
                                       ></div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                           <div className="mt-4 pt-4 border-t border-slate-200">
                              <div className="flex justify-between">
                                 <span className="text-sm font-medium text-slate-600">Weekly Total:</span>
                                 <span className="text-lg font-bold text-emerald-600">৳1,331,000</span>
                              </div>
                           </div>
                        </Card>

                        {/* Business Type Distribution */}
                        <Card className="shadow-lg bg-white">
                           <h3 className="text-lg font-bold text-slate-900 mb-4">Revenue by Service Type</h3>
                           <div className="space-y-4">
                              {[
                                 { type: 'Consultations', revenue: 5200000, percentage: 42, color: 'blue' },
                                 { type: 'Telemedicine', revenue: 3100000, percentage: 25, color: 'purple' },
                                 { type: 'Diagnostics', revenue: 2600000, percentage: 21, color: 'amber' },
                                 { type: 'Ambulance', revenue: 1600000, percentage: 12, color: 'red' }
                              ].map((item) => (
                                 <div key={item.type}>
                                    <div className="flex justify-between mb-2">
                                       <span className="text-sm font-semibold text-slate-700">{item.type}</span>
                                       <span className="text-sm font-medium text-slate-500">৳{(item.revenue / 1000000).toFixed(1)}M ({item.percentage}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-4">
                                       <div
                                          className={`h-4 rounded-full transition-all ${item.color === 'blue' ? 'bg-blue-500' :
                                             item.color === 'purple' ? 'bg-purple-500' :
                                                item.color === 'amber' ? 'bg-amber-500' :
                                                   'bg-red-500'
                                             }`}
                                          style={{ width: `${item.percentage}%` }}
                                       ></div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                           <div className="mt-4 pt-4 border-t border-slate-200">
                              <div className="grid grid-cols-2 gap-3">
                                 <div className="text-center p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-500 mb-1">Total Transactions</p>
                                    <p className="text-xl font-bold text-slate-900">2,847</p>
                                 </div>
                                 <div className="text-center p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-500 mb-1">Avg. Value</p>
                                    <p className="text-xl font-bold text-slate-900">৳4,387</p>
                                 </div>
                              </div>
                           </div>
                        </Card>
                     </div>

                     {/* Hospital Performance Rankings */}
                     <Card className="shadow-lg bg-white">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Top Performing Hospitals (Revenue)</h3>
                        <div className="overflow-x-auto">
                           <table className="w-full">
                              <thead className="bg-slate-50 border-b-2 border-slate-200">
                                 <tr>
                                    <th className="p-3 text-left font-semibold text-slate-700">Rank</th>
                                    <th className="p-3 text-left font-semibold text-slate-700">Hospital</th>
                                    <th className="p-3 text-left font-semibold text-slate-700">Revenue (Monthly)</th>
                                    <th className="p-3 text-left font-semibold text-slate-700">Patients</th>
                                    <th className="p-3 text-left font-semibold text-slate-700">Growth</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {[
                                    { rank: 1, name: 'Dhaka Medical College', revenue: 2800000, patients: 1247, growth: '+18.5%' },
                                    { rank: 2, name: 'Square Hospital', revenue: 2350000, patients: 892, growth: '+22.3%' },
                                    { rank: 3, name: 'Apollo Hospital', revenue: 1980000, patients: 756, growth: '+15.7%' },
                                    { rank: 4, name: 'United Hospital', revenue: 1750000, patients: 643, growth: '+19.2%' },
                                    { rank: 5, name: 'Labaid Hospital', revenue: 1420000, patients: 521, growth: '+12.8%' }
                                 ].map((hospital) => (
                                    <tr key={hospital.rank} className="border-b border-slate-100 hover:bg-slate-50">
                                       <td className="p-3">
                                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${hospital.rank === 1 ? 'bg-amber-100 text-amber-600' :
                                             hospital.rank === 2 ? 'bg-slate-100 text-slate-600' :
                                                hospital.rank === 3 ? 'bg-orange-100 text-orange-600' :
                                                   'bg-slate-50 text-slate-500'
                                             }`}>
                                             #{hospital.rank}
                                          </span>
                                       </td>
                                       <td className="p-3 font-medium text-slate-900">{hospital.name}</td>
                                       <td className="p-3 font-semibold text-emerald-600">৳{hospital.revenue.toLocaleString()}</td>
                                       <td className="p-3 text-slate-600">{hospital.patients.toLocaleString()}</td>
                                       <td className="p-3">
                                          <Badge color="green">{hospital.growth}</Badge>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </Card>

                     {/* System Activity Charts */}
                     {chartData.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                           <Card className="shadow-lg bg-white">
                              <div className="flex items-center gap-2 mb-6">
                                 <BarChart3 className="text-indigo-600" size={24} />
                                 <h3 className="text-lg font-bold text-slate-900">Action Distribution</h3>
                              </div>
                              <div className="space-y-4">
                                 {chartData.map((item: any) => (
                                    <div key={item.action}>
                                       <div className="flex justify-between mb-2">
                                          <span className="text-sm font-semibold text-slate-700">{item.action}</span>
                                          <span className="text-sm font-medium text-slate-500">{item.count} ({item.percentage}%)</span>
                                       </div>
                                       <div className="w-full bg-slate-200 rounded-full h-4">
                                          <div
                                             className={`h-4 rounded-full transition-all ${item.action === 'CREATE' ? 'bg-blue-500' :
                                                item.action === 'UPDATE' ? 'bg-amber-500' :
                                                   item.action === 'DELETE' ? 'bg-red-500' :
                                                      'bg-slate-500'
                                                }`}
                                             style={{ width: `${item.percentage}%` }}
                                          ></div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </Card>

                           <Card className="shadow-lg bg-white">
                              <div className="flex items-center gap-2 mb-6">
                                 <TrendingUp className="text-emerald-600" size={24} />
                                 <h3 className="text-lg font-bold text-slate-900">Activity Summary</h3>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                 <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                                    <p className="text-sm font-medium text-blue-900 mb-1">Total</p>
                                    <p className="text-3xl font-bold text-blue-600">{auditLogs.length}</p>
                                 </div>
                                 <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200">
                                    <p className="text-sm font-medium text-emerald-900 mb-1">Creates</p>
                                    <p className="text-3xl font-bold text-emerald-600">
                                       {auditLogs.filter(l => l.action_type === 'CREATE').length}
                                    </p>
                                 </div>
                                 <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
                                    <p className="text-sm font-medium text-amber-900 mb-1">Updates</p>
                                    <p className="text-3xl font-bold text-amber-600">
                                       {auditLogs.filter(l => l.action_type === 'UPDATE').length}
                                    </p>
                                 </div>
                                 <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                                    <p className="text-sm font-medium text-red-900 mb-1">Deletes</p>
                                    <p className="text-3xl font-bold text-red-600">
                                       {auditLogs.filter(l => l.action_type === 'DELETE').length}
                                    </p>
                                 </div>
                              </div>
                           </Card>
                        </div>
                     )}

                     {/* Audit Logs Table */}
                     <Card className="shadow-lg bg-white">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Activity Logs</h3>
                        {isLoading ? (
                           <div className="text-center py-16">
                              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                              <p className="text-slate-500 mt-4">Loading logs...</p>
                           </div>
                        ) : auditLogs.length === 0 ? (
                           <div className="text-center py-16">
                              <FileText className="mx-auto mb-4 text-slate-300" size={64} />
                              <p className="text-slate-500 text-lg">No audit logs found</p>
                           </div>
                        ) : (
                           <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                 <thead className="bg-slate-50 border-b-2 border-slate-200">
                                    <tr>
                                       <th className="p-3 text-left font-semibold text-slate-700">Timestamp</th>
                                       <th className="p-3 text-left font-semibold text-slate-700">Action</th>
                                       <th className="p-3 text-left font-semibold text-slate-700">User</th>
                                       <th className="p-3 text-left font-semibold text-slate-700">Description</th>
                                       <th className="p-3 text-left font-semibold text-slate-700">IP Address</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {auditLogs.slice(0, 50).map((log) => (
                                       <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                          <td className="p-3 text-slate-600 text-xs whitespace-nowrap">
                                             {new Date(log.created_at).toLocaleString()}
                                          </td>
                                          <td className="p-3">
                                             <Badge color={getActionColor(log.action_type) as any}>
                                                {log.action_type}
                                             </Badge>
                                          </td>
                                          <td className="p-3 text-slate-700 font-medium">{log.user_email || 'System'}</td>
                                          <td className="p-3 text-slate-600 max-w-sm truncate">{log.description}</td>
                                          <td className="p-3 text-xs font-mono text-slate-500">{log.ip_address || '-'}</td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        )}
                     </Card>
                  </div>
               )}
            </div>
         </main>

         {/* User Modal */}
         {showUserModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
               <div className="bg-white rounded-xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-2xl font-bold text-slate-900">
                        {editingUser ? 'Edit User' : 'Create New User'}
                     </h2>
                     <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                     </button>
                  </div>

                  <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-5">
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address*</label>
                        <input
                           type="email"
                           required
                           value={formData.email}
                           onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                           className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                           placeholder="user@example.com"
                        />
                     </div>

                     {!editingUser && (
                        <>
                           <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Password*</label>
                              <div className="relative">
                                 <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg pr-12 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    placeholder="••••••••"
                                 />
                                 <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                 >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                 </button>
                              </div>
                           </div>

                           <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Role*</label>
                              <select
                                 required
                                 value={formData.role}
                                 onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                 className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                              >
                                 <option value="PATIENT">Patient</option>
                                 <option value="DOCTOR">Doctor</option>
                                 <option value="HOSPITAL_ADMIN">Hospital Admin</option>
                                 <option value="SUPER_ADMIN">Super Admin</option>
                              </select>
                           </div>
                        </>
                     )}

                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name*</label>
                        <input
                           type="text"
                           required
                           value={formData.name}
                           onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                           className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                           placeholder="John Doe"
                        />
                     </div>

                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                        <input
                           type="tel"
                           value={formData.phone}
                           onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                           className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                           placeholder="+880 1XXXXXXXXX"
                        />
                     </div>

                     {!editingUser && formData.role === 'DOCTOR' && (
                        <>
                           <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Specialization</label>
                              <input
                                 type="text"
                                 value={formData.specialization}
                                 onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                                 className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                 placeholder="e.g., Cardiologist"
                              />
                           </div>
                           <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Consultation Fee (৳)</label>
                              <input
                                 type="number"
                                 value={formData.consultationFee}
                                 onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                                 className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                 placeholder="1000"
                              />
                           </div>
                        </>
                     )}

                     <div className="flex gap-3 pt-6">
                        <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 py-3 shadow-lg font-semibold">
                           {editingUser ? 'Update User' : 'Create User'}
                        </Button>
                        <Button
                           type="button"
                           variant="outline"
                           onClick={() => setShowUserModal(false)}
                           className="flex-1 py-3"
                        >
                           Cancel
                        </Button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};