import React, { useState, useEffect } from 'react';
import { Building2, Bed, FileText, Search, MapPin, Phone, Mail } from 'lucide-react';
import { Card, Badge, Button } from './UIComponents';
import { api } from '../services/apiClient';

interface HospitalResource {
    id: number;
    hospital_id: number;
    resource_type: string;
    total_capacity: number;
    available: number;
    occupied: number;
}

interface Department {
    id: number;
    name: string;
    description?: string;
}

interface Test {
    id: number;
    name: string;
    cost: number;
    description?: string;
    department_name: string;
}

interface HospitalInfo {
    id: number;
    name: string;
    address: string;
    city: string;
    phone: string;
}

interface HospitalResourcesData {
    hospital: HospitalInfo;
    resources: HospitalResource[];
    departments: Department[];
    tests: Test[];
}

interface HospitalResourcesViewProps {
    hospitalId?: number;
}

export const HospitalResourcesView: React.FC<HospitalResourcesViewProps> = ({ hospitalId }) => {
    const [resourcesData, setResourcesData] = useState<HospitalResourcesData | null>(null);
    const [hospitals, setHospitals] = useState<HospitalInfo[]>([]);
    const [selectedHospitalId, setSelectedHospitalId] = useState<number | undefined>(hospitalId);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch list of hospitals on mount
    useEffect(() => {
        const fetchHospitals = async () => {
            try {
                const response = await api.get<HospitalInfo[]>('/hospitals');
                setHospitals(response.data);
            } catch (err: any) {
                console.error('Error fetching hospitals:', err);
            }
        };
        fetchHospitals();
    }, []);

    // Fetch resources when hospital is selected
    useEffect(() => {
        if (selectedHospitalId) {
            fetchHospitalResources(selectedHospitalId);
        }
    }, [selectedHospitalId]);

    const fetchHospitalResources = async (hospId: number) => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await api.get<HospitalResourcesData>(`/hospitals/${hospId}/resources`);
            setResourcesData(response.data);
        } catch (err: any) {
            console.error('Error fetching hospital resources:', err);
            setError(err.message || 'Failed to load hospital resources');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTests = resourcesData?.tests.filter(test =>
        test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.department_name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const getBedTypeIcon = (type: string) => {
        return <Bed size={24} className="text-primary-600" />;
    };

    const getBedAvailabilityColor = (available: number, total: number) => {
        const percentage = (available / total) * 100;
        if (percentage > 50) return 'text-green-600';
        if (percentage > 20) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Hospital Selector */}
            <Card className="p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Building2 size={24} className="text-primary-600" />
                    Select Hospital
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hospitals.map(hospital => (
                        <button
                            key={hospital.id}
                            onClick={() => setSelectedHospitalId(hospital.id)}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${selectedHospitalId === hospital.id
                                ? 'border-primary-600 bg-primary-50'
                                : 'border-slate-200 hover:border-primary-300 bg-white'
                                }`}
                        >
                            <h4 className="font-bold text-slate-900 mb-1">{hospital.name}</h4>
                            <p className="text-sm text-slate-600 flex items-center gap-1 mb-1">
                                <MapPin size={14} /> {hospital.address}, {hospital.city}
                            </p>
                            <p className="text-sm text-slate-600 flex items-center gap-1">
                                <Phone size={14} /> {hospital.phone}
                            </p>
                        </button>
                    ))}
                </div>
            </Card>

            {/* Loading State */}
            {isLoading && (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="mt-4 text-slate-600">Loading hospital resources...</p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <Card className="p-6 bg-red-50 border-red-200">
                    <p className="text-red-700 font-semibold">{error}</p>
                </Card>
            )}

            {/* Resources Display */}
            {resourcesData && !isLoading && (
                <>
                    {/* Hospital Info Header */}
                    <Card className="p-6 bg-gradient-to-r from-primary-50 to-blue-50">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">{resourcesData.hospital.name}</h2>
                        <p className="text-slate-600 flex items-center gap-2">
                            <MapPin size={16} /> {resourcesData.hospital.address}, {resourcesData.hospital.city}
                        </p>
                        <p className="text-slate-600 flex items-center gap-2 mt-1">
                            <Phone size={16} /> {resourcesData.hospital.phone}
                        </p>
                    </Card>

                    {/* Bed Availability */}
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Bed size={24} className="text-primary-600" />
                            Bed Availability
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {resourcesData.resources.map(resource => (
                                <Card key={resource.id} className="p-6 hover:shadow-lg transition-shadow">
                                    <div className="flex items-start justify-between mb-4">
                                        {getBedTypeIcon(resource.resource_type)}
                                        <Badge variant={resource.available > 0 ? 'success' : 'default'}>
                                            {resource.available > 0 ? 'Available' : 'Full'}
                                        </Badge>
                                    </div>
                                    <h4 className="font-bold text-slate-900 text-lg mb-2">
                                        {resource.resource_type.replace('_', ' ').toUpperCase()}
                                    </h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Total:</span>
                                            <span className="font-bold text-slate-900">{resource.total_capacity}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Available:</span>
                                            <span className={`font-bold ${getBedAvailabilityColor(resource.available, resource.total_capacity)}`}>
                                                {resource.available}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Occupied:</span>
                                            <span className="font-bold text-slate-900">{resource.occupied}</span>
                                        </div>
                                    </div>
                                    {/* Availability Bar */}
                                    <div className="mt-4 bg-slate-200 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${resource.available > resource.total_capacity / 2
                                                ? 'bg-green-500'
                                                : resource.available > 0
                                                    ? 'bg-yellow-500'
                                                    : 'bg-red-500'
                                                }`}
                                            style={{ width: `${(resource.available / resource.total_capacity) * 100}%` }}
                                        ></div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Diagnostic Tests */}
                    <div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <FileText size={24} className="text-primary-600" />
                                Diagnostic Tests & Services
                            </h3>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search tests..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>

                        {/* Group tests by department */}
                        {resourcesData.departments.map(dept => {
                            const deptTests = filteredTests.filter(t => t.department_name === dept.name);
                            if (deptTests.length === 0) return null;

                            return (
                                <Card key={dept.id} className="p-6 mb-4">
                                    <h4 className="font-bold text-lg text-slate-900 mb-3">{dept.name}</h4>
                                    {dept.description && (
                                        <p className="text-sm text-slate-600 mb-4">{dept.description}</p>
                                    )}
                                    <div className="space-y-2">
                                        {deptTests.map(test => (
                                            <div
                                                key={test.id}
                                                className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 transition-colors"
                                            >
                                                <div className="flex-1">
                                                    <p className="font-semibold text-slate-900">{test.name}</p>
                                                    {test.description && (
                                                        <p className="text-sm text-slate-600 mt-1">{test.description}</p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-primary-600 text-lg">৳{test.cost}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            );
                        })}

                        {filteredTests.length === 0 && (
                            <Card className="p-8 text-center">
                                <p className="text-slate-500">No tests found matching your search.</p>
                            </Card>
                        )}
                    </div>
                </>
            )}

            {/* Empty State */}
            {!selectedHospitalId && !isLoading && (
                <Card className="p-12 text-center">
                    <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 text-lg">Select a hospital to view resources and services</p>
                </Card>
            )}
        </div>
    );
};
