
import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Paperclip, Send, ArrowLeft, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { Button, Card } from '../components/UIComponents';
import { api } from '../services/apiClient';

interface TelemedicineViewProps {
    onEndCall: () => void;
    appointment?: any;
    userRole?: string;
}

export const TelemedicineView = ({ onEndCall, appointment, userRole }: TelemedicineViewProps) => {
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [callStatus, setCallStatus] = useState<'CONNECTING' | 'CONNECTED' | 'ENDED' | 'COMPLETED'>('CONNECTING');
    const [messages, setMessages] = useState<{ sender: string, text: string }[]>([]);
    const [inputMsg, setInputMsg] = useState('');
    const [sessionDuration, setSessionDuration] = useState(0);

    const isDoctor = userRole === 'DOCTOR';
    const remoteName = isDoctor ? appointment?.patientName : appointment?.doctorName || 'Dr. Omor Faruck Ullas';
    const remoteImage = isDoctor
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(remoteName || 'Patient')}&background=random`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(remoteName || 'Doctor')}&background=0D8ABC&color=fff`;

    // Simulate connection
    useEffect(() => {
        const timer = setTimeout(() => {
            setCallStatus('CONNECTED');
            setMessages([{ sender: remoteName, text: 'Hello! I can see and hear you clearly.' }]);
        }, 2000);
        return () => clearTimeout(timer);
    }, [remoteName]);

    // Session timer
    useEffect(() => {
        let interval: any;
        if (callStatus === 'CONNECTED') {
            interval = setInterval(() => {
                setSessionDuration(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [callStatus]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const sendMessage = () => {
        if (!inputMsg.trim()) return;
        setMessages([...messages, { sender: 'Me', text: inputMsg }]);
        setInputMsg('');
    };

    const handleHangup = () => {
        setCallStatus('ENDED');
    };

    const handleRedial = () => {
        setCallStatus('CONNECTING');
        // Re-trigger connection simulation
        setTimeout(() => {
            setCallStatus('CONNECTED');
        }, 1500);
    };

    const handleCompleteSession = async () => {
        if (!appointment?.id) {
            handleHangup();
            return;
        }

        try {
            await api.updateAppointment(appointment.id, { status: 'COMPLETED' });
            setCallStatus('COMPLETED');
        } catch (error) {
            console.error('Failed to complete session:', error);
            alert('Failed to update session status. Please try again.');
        }
    };

    // --- RENDER: ENDED / REDIAL SCREEN ---
    if (callStatus === 'ENDED') {
        return (
            <div className="fixed inset-0 bg-slate-900 z-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center p-8 bg-white/95 backdrop-blur">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                        <PhoneOff size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Call Ended</h2>
                    <p className="text-slate-600 mb-8">Duration: {formatDuration(sessionDuration)}</p>

                    <div className="space-y-3">
                        <Button onClick={handleRedial} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 flex items-center justify-center gap-2">
                            <RefreshCw size={20} /> Redial / Reconnect
                        </Button>

                        {isDoctor ? (
                            <Button onClick={handleCompleteSession} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 flex items-center justify-center gap-2">
                                <CheckCircle size={20} /> Complete Session
                            </Button>
                        ) : (
                            <Button onClick={onEndCall} variant="outline" className="w-full border-slate-300 py-3">
                                Back to Dashboard
                            </Button>
                        )}

                        {isDoctor && (
                            <Button onClick={onEndCall} variant="ghost" className="w-full text-slate-500 mt-2">
                                Leave without Completing
                            </Button>
                        )}
                    </div>
                </Card>
            </div>
        );
    }

    // --- RENDER: COMPLETED SCREEN (Doctor only) ---
    if (callStatus === 'COMPLETED') {
        return (
            <div className="fixed inset-0 bg-slate-900 z-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center p-8 bg-white/95 backdrop-blur">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Session Completed</h2>
                    <p className="text-slate-600 mb-8">The appointment status has been updated.</p>
                    <Button onClick={onEndCall} className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3">
                        Back to Dashboard
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
            {/* Header/Back Button Overlay */}
            <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
                <Button variant="secondary" onClick={handleHangup} className="bg-black/40 text-white hover:bg-black/60 border-none backdrop-blur-md flex items-center gap-2">
                    <ArrowLeft size={20} /> Leave
                </Button>
                <div className="bg-black/40 text-white px-3 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-2 text-sm font-mono">
                    <div className={`w-2 h-2 rounded-full ${callStatus === 'CONNECTED' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                    {formatDuration(sessionDuration)}
                </div>
            </div>

            {/* Main Video Area */}
            <div className="flex-1 relative flex">

                {/* Main Feed (Remote) */}
                <div className="flex-1 bg-slate-800 relative flex items-center justify-center">
                    {callStatus === 'CONNECTING' ? (
                        <div className="text-center">
                            <div className="w-24 h-24 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto mb-4"></div>
                            <p className="text-white text-lg">Connecting to {remoteName}...</p>
                        </div>
                    ) : (
                        <div className="text-white text-center w-full h-full relative">
                            <img
                                src={remoteImage}
                                alt="Remote User"
                                className="absolute inset-0 w-full h-full object-cover opacity-90"
                            />
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 px-4 py-2 rounded-full text-white text-sm backdrop-blur">
                                {remoteName}
                            </div>
                        </div>
                    )}
                </div>

                {/* Side Chat Panel */}
                {showChat && (
                    <div className="w-80 bg-white flex flex-col border-l border-slate-200">
                        <div className="p-4 border-b border-slate-100 font-bold flex justify-between items-center">
                            <span>Chat</span>
                            <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-slate-600"><ArrowLeft size={18} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex flex-col ${m.sender === 'Me' ? 'items-end' : 'items-start'}`}>
                                    <div className={`px-3 py-2 rounded-lg max-w-[85%] text-sm ${m.sender === 'Me' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-slate-100 flex gap-2">
                            <input
                                className="flex-1 border border-slate-200 rounded px-2 text-sm focus:outline-none focus:border-primary-500 bg-white"
                                placeholder="Type..."
                                value={inputMsg}
                                onChange={e => setInputMsg(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                            />
                            <button onClick={sendMessage} className="text-primary-600 hover:bg-primary-50 p-2 rounded"><Send size={18} /></button>
                        </div>
                    </div>
                )}

                {/* Self View (PIP) */}
                <div className="absolute bottom-24 right-6 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-slate-700 shadow-xl">
                    {videoOn ? (
                        <img src={isDoctor
                            ? `https://ui-avatars.com/api/?name=${encodeURIComponent(appointment?.doctorName || 'Me')}&background=0D8ABC&color=fff`
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(appointment?.patientName || 'Me')}&background=random`}
                            className="w-full h-full object-cover" alt="Me" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">Camera Off</div>
                    )}
                    <div className="absolute bottom-1 left-2 text-xs text-white drop-shadow">You {micOn ? '' : '(Muted)'}</div>
                </div>
            </div>

            {/* Controls */}
            <div className="h-20 bg-slate-950 flex items-center justify-center gap-4 px-4">
                <button
                    onClick={() => setMicOn(!micOn)}
                    className={`p-4 rounded-full transition-all ${micOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-500 text-white'}`}
                    title={micOn ? "Mute" : "Unmute"}
                >
                    {micOn ? <Mic size={24} /> : <MicOff size={24} />}
                </button>
                <button
                    onClick={() => setVideoOn(!videoOn)}
                    className={`p-4 rounded-full transition-all ${videoOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-500 text-white'}`}
                    title={videoOn ? "Turn Camera Off" : "Turn Camera On"}
                >
                    {videoOn ? <Video size={24} /> : <VideoOff size={24} />}
                </button>
                <button
                    onClick={handleHangup}
                    className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 px-8 flex items-center gap-2 font-bold transition-all"
                    title="End Call"
                >
                    <PhoneOff size={24} /> End
                </button>
                <button
                    onClick={() => setShowChat(!showChat)}
                    className={`p-4 rounded-full transition-all ${showChat ? 'bg-primary-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                    title="Chat"
                >
                    <MessageSquare size={24} />
                </button>
                <button className="p-4 rounded-full bg-slate-800 text-white hover:bg-slate-700 hidden md:block" title="Share Screen">
                    <Paperclip size={24} />
                </button>
            </div>
        </div>
    );
};
