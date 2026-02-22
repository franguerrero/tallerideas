import React, { useState, useEffect } from 'react';
import { Bot, Clock, ChevronRight, Plus, Star, Trash2, ArrowRight, CheckCircle, Rocket, Lightbulb, Target, Trophy, Printer, Download, Users, UserPlus, LogOut } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

// --- INICIALIZACIÓN DE FIREBASE ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';

// --- CONFIGURACIÓN DEL TALLER ---
const PREGUNTAS_GUIA = [
    "¿Qué tareas son las que realizas frecuentemente en tu día a día?",
    "¿Cuáles son las tareas donde inviertes más tiempo?",
    "¿Qué puntos de mejora identificas en tu día a día?",
    "¿Hay alguna ineficiencia en los procedimientos que se ejecutan?",
    "¿Se desatienden tareas por falta de tiempo o personal?"
];

const FASES = [
    { id: 0, titulo: "Arranque", icon: Rocket, tiempo: 120, desc: "Preparación" },
    { id: 1, titulo: "Lluvia de ideas", icon: Lightbulb, tiempo: 300, desc: "Individual" },
    { id: 2, titulo: "Selección", icon: Target, tiempo: 300, desc: "En equipo" },
    { id: 3, titulo: "Priorización", icon: Star, tiempo: 180, desc: "Relámpago" },
    { id: 4, titulo: "Puesta en común", icon: Trophy, tiempo: 300, desc: "Resultados" }
];

const POSTIT_COLORS = [
    'bg-yellow-200 text-yellow-900 border-yellow-300',
    'bg-pink-200 text-pink-900 border-pink-300',
    'bg-blue-200 text-blue-900 border-blue-300',
    'bg-green-200 text-green-900 border-green-300',
    'bg-purple-200 text-purple-900 border-purple-300'
];

const ROTATIONS = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2', 'rotate-0'];

export default function App() {
    // --- ESTADOS DE AUTENTICACIÓN Y DATOS GLOBALES ---
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    const [allUsers, setAllUsers] = useState([]);
    const [allGroups, setAllGroups] = useState([]);
    const [allIdeas, setAllIdeas] = useState([]);

    // --- ESTADOS LOCALES DE LA UI ---
    const [tempName, setTempName] = useState("");
    const [tempGroupName, setTempGroupName] = useState("");
    const [nuevaIdea, setNuevaIdea] = useState("");
    const [localTiempo, setLocalTiempo] = useState(0);

    // 1. Inicializar Autenticación
    useEffect(() => {
        const initAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Error de autenticación:", error);
            }
        };
        initAuth();

        const unsubscribe = onAuthStateChanged(auth, (usr) => {
            setUser(usr);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 2. Suscripciones a Datos en Tiempo Real (Solo si hay usuario)
    useEffect(() => {
        if (!user) return;

        // Colecciones públicas
        const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
        const groupsRef = collection(db, 'artifacts', appId, 'public', 'data', 'groups');
        const ideasRef = collection(db, 'artifacts', appId, 'public', 'data', 'ideas');

        const unsubUsers = onSnapshot(usersRef, (snapshot) => {
            setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, console.error);

        const unsubGroups = onSnapshot(groupsRef, (snapshot) => {
            setAllGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, console.error);

        const unsubIdeas = onSnapshot(ideasRef, (snapshot) => {
            setAllIdeas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, console.error);

        return () => {
            unsubUsers();
            unsubGroups();
            unsubIdeas();
        };
    }, [user]);

    // --- DATOS DERIVADOS PARA EL USUARIO ACTUAL ---
    const myProfile = allUsers.find(u => u.id === user?.uid);
    const myGroup = myProfile?.groupId ? allGroups.find(g => g.id === myProfile.groupId) : null;
    const groupIdeas = myGroup ? allIdeas.filter(i => i.groupId === myGroup.id) : [];
    const ideasSeleccionadas = groupIdeas.filter(i => i.seleccionada);

    // 3. Efecto para el Temporizador Sincronizado
    useEffect(() => {
        if (!myGroup) return;

        const interval = setInterval(() => {
            const elapsedSeconds = Math.floor((Date.now() - myGroup.faseStartTime) / 1000);
            const remaining = Math.max(0, FASES[myGroup.faseActual].tiempo - elapsedSeconds);
            setLocalTiempo(remaining);
        }, 1000);

        return () => clearInterval(interval);
    }, [myGroup?.faseActual, myGroup?.faseStartTime]);

    // Formatear segundos a MM:SS
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // --- ACCIONES MULTIJUGADOR ---

    const guardarPerfil = async (e) => {
        e.preventDefault();
        if (!tempName.trim()) return;
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), {
            nombre: tempName.trim(),
            groupId: null
        });
    };

    const crearGrupo = async (e) => {
        e.preventDefault();
        if (!tempGroupName.trim()) return;

        // Crear nuevo documento de grupo con ID auto-generado
        const newGroupRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'groups'));
        await setDoc(newGroupRef, {
            nombre: tempGroupName.trim(),
            faseActual: 0,
            faseStartTime: Date.now()
        });

        // Unir al usuario al grupo recién creado
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), {
            groupId: newGroupRef.id
        });
        setTempGroupName("");
    };

    const unirseGrupo = async (groupId) => {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), {
            groupId: groupId
        });
    };

    const salirDelGrupo = async () => {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), {
            groupId: null
        });
    };

    const avanzarFase = async () => {
        if (myGroup && myGroup.faseActual < FASES.length - 1) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'groups', myGroup.id), {
                faseActual: myGroup.faseActual + 1,
                faseStartTime: Date.now()
            });
        }
    };

    const agregarIdea = async (e) => {
        e.preventDefault();
        if (!nuevaIdea.trim() || !myGroup) return;

        const randomColor = POSTIT_COLORS[Math.floor(Math.random() * POSTIT_COLORS.length)];
        const randomRotation = ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)];

        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'ideas'), {
            groupId: myGroup.id,
            autor: myProfile.nombre,
            autorId: user.uid,
            texto: nuevaIdea.trim(),
            seleccionada: false,
            beneficio: 'Medio',
            esfuerzo: 'Medio',
            color: randomColor,
            rotation: randomRotation,
            timestamp: Date.now()
        });

        setNuevaIdea("");
    };

    const eliminarIdea = async (id, autorId) => {
        // Opcional: Solo permitir borrar si eres el autor o en fase de grupo
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'ideas', id));
    };

    const toggleSeleccion = async (idea) => {
        if (!idea.seleccionada && ideasSeleccionadas.length >= 3) return; // Límite de 3
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'ideas', idea.id), {
            seleccionada: !idea.seleccionada
        });
    };

    const actualizarMetrica = async (id, campo, valor) => {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'ideas', id), {
            [campo]: valor
        });
    };

    const exportarDatos = () => {
        let contenido = `TALLER RPA - RESULTADOS\n`;
        contenido += `Equipo: ${myGroup?.nombre || "Sin Nombre"}\n`;
        contenido += `Participantes: ${allUsers.filter(u => u.groupId === myGroup?.id).map(u => u.nombre).join(', ')}\n`;
        contenido += `Fecha: ${new Date().toLocaleDateString()}\n\n`;
        contenido += `TAREAS SELECCIONADAS:\n`;
        contenido += `------------------------\n`;

        ideasSeleccionadas.forEach((idea, idx) => {
            contenido += `${idx + 1}. ${idea.texto} (Propuesto por: ${idea.autor})\n`;
            contenido += `   Beneficio: ${idea.beneficio} | Esfuerzo: ${idea.esfuerzo}\n`;
            if (idea.beneficio === 'Alto' && idea.esfuerzo === 'Bajo') {
                contenido += `   [!] QUICK WIN RECOMENDADO\n`;
            }
            contenido += `\n`;
        });

        const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Resultados_RPA_${myGroup?.nombre || 'Equipo'}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // --- COMPONENTES UI ---

    if (authLoading) {
        return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin text-teal-500"><Bot size={48} /></div></div>;
    }

    // --- PANTALLA DE LOGIN ---
    if (!myProfile) {
        return (
            <div className="h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100">
                    <div className="bg-gradient-to-br from-indigo-500 to-teal-400 p-4 rounded-full inline-block mb-6 shadow-md">
                        <Users size={48} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Bienvenido al Taller</h1>
                    <p className="text-slate-500 mb-8">Para colaborar con tus compañeros, dinos cómo te llamas.</p>

                    <form onSubmit={guardarPerfil} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Tu nombre completo o alias..."
                            className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none text-slate-800 font-medium"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            required
                        />
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-indigo-200">
                            Entrar <ChevronRight className="ml-2" />
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- PANTALLA DE LOBBY (Asignación de Grupos) ---
    if (!myGroup) {
        return (
            <div className="h-screen bg-slate-50 flex flex-col p-4 md:p-8 overflow-y-auto">
                <div className="max-w-4xl w-full mx-auto space-y-8">

                    <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center space-x-4">
                            <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600 font-bold text-xl">{myProfile.nombre.charAt(0).toUpperCase()}</div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Hola, {myProfile.nombre}</h2>
                                <p className="text-sm text-slate-500">Únete a un grupo de trabajo o crea uno nuevo.</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Crear Grupo */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Plus className="mr-2 text-teal-500" /> Crear Nuevo Grupo</h3>
                            <form onSubmit={crearGrupo} className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Nombre del grupo (Ej: Dpto. Finanzas)..."
                                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 outline-none"
                                    value={tempGroupName}
                                    onChange={(e) => setTempGroupName(e.target.value)}
                                    required
                                />
                                <button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-xl flex items-center justify-center transition-colors shadow-md">
                                    Crear y Unirse <ArrowRight className="ml-2" size={18} />
                                </button>
                            </form>
                        </div>

                        {/* Lista de Grupos Existentes */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Users className="mr-2 text-indigo-500" /> Grupos Activos</h3>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {allGroups.length === 0 ? (
                                    <p className="text-slate-400 text-center py-8">No hay grupos creados todavía.</p>
                                ) : (
                                    allGroups.map(grupo => {
                                        const miembros = allUsers.filter(u => u.groupId === grupo.id);
                                        return (
                                            <div key={grupo.id} className="border border-slate-200 p-4 rounded-2xl flex items-center justify-between hover:border-indigo-300 transition-colors">
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{grupo.nombre}</h4>
                                                    <p className="text-xs text-slate-500">{miembros.length} miembros unidos</p>
                                                </div>
                                                <button
                                                    onClick={() => unirseGrupo(grupo.id)}
                                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center transition-colors"
                                                >
                                                    Unirse <UserPlus size={16} className="ml-1" />
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    // --- COMPONENTES UI DEL TALLER ---

    const Stepper = () => (
        <div className="w-full max-w-4xl mx-auto mb-6 hidden lg:block">
            <div className="flex justify-between items-center relative">
                <div className="absolute top-5 left-0 w-full h-1 bg-slate-200 -z-10"></div>
                {myGroup.faseActual > 0 && (
                    <div
                        className="absolute top-5 left-0 h-1 bg-teal-500 -z-10 transition-all duration-500"
                        style={{ width: `${(myGroup.faseActual / (FASES.length - 1)) * 100}%` }}
                    ></div>
                )}

                {FASES.map((fase, idx) => {
                    const Icon = fase.icon;
                    const isActive = idx === myGroup.faseActual;
                    const isPast = idx < myGroup.faseActual;

                    return (
                        <div key={idx} className="flex flex-col items-center relative z-10 w-24">
                            <div className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-md
                ${isActive ? 'bg-indigo-600 text-white scale-110 ring-4 ring-indigo-100' :
                                    isPast ? 'bg-teal-500 text-white' : 'bg-white text-slate-400 border-2 border-slate-200'}
              `}>
                                <Icon size={18} />
                            </div>
                            <div className="text-center mt-2 bg-white/80 px-2 rounded backdrop-blur-sm">
                                <p className={`text-xs font-bold ${isActive ? 'text-indigo-700' : isPast ? 'text-teal-600' : 'text-slate-400'}`}>{fase.titulo}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // --- RENDERIZADO DE FASES DEL TALLER ---

    const renderFase0 = () => (
        <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto animate-fade-in">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-400 blur-[60px] opacity-30 rounded-full animate-pulse"></div>
                <div className="bg-gradient-to-br from-indigo-500 to-teal-400 p-6 rounded-3xl inline-block shadow-xl">
                    <Bot size={80} className="text-white" />
                </div>
            </div>

            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-800 to-teal-600 mb-4 tracking-tight">
                Equipo: {myGroup.nombre}
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-md font-medium">
                Esperando a que todos se unan. Cuando estéis listos, podéis avanzar a la primera fase.
            </p>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 w-full max-w-sm mb-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Miembros Activos</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                    {allUsers.filter(u => u.groupId === myGroup.id).map(u => (
                        <span key={u.id} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold border border-indigo-100">
                            {u.nombre}
                        </span>
                    ))}
                </div>
            </div>

            <button
                onClick={avanzarFase}
                className="group bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300"
            >
                ¡Empezar Taller!
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
            </button>
        </div>
    );

    const renderFase1 = () => (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full animate-fade-in">
            {/* Panel Izquierdo: Inspiración */}
            <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[40vh] lg:h-full">
                <div className="flex items-center space-x-3 mb-6 bg-indigo-50 p-4 rounded-2xl">
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                        <Lightbulb size={24} />
                    </div>
                    <h2 className="text-lg font-extrabold text-indigo-900">Inspiración</h2>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <ul className="space-y-5">
                        {PREGUNTAS_GUIA.map((preg, idx) => (
                            <li key={idx} className="flex items-start text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <span className="text-teal-500 font-bold mr-3 mt-0.5 text-lg">•</span>
                                {preg}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Panel Derecho: Tablero de Ideas y Formulario */}
            <div className="lg:col-span-3 flex flex-col space-y-4 h-[50vh] min-h-[400px] lg:h-full relative">

                {/* Formulario Superior */}
                <form onSubmit={agregarIdea} className="bg-white p-2 sm:p-3 rounded-2xl shadow-lg border border-slate-200 flex space-x-2 sm:space-x-3 items-center shrink-0 w-full mb-2">
                    <div className="bg-slate-100 p-2 sm:p-3 rounded-xl text-slate-400 hidden sm:block">
                        <Plus size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Escribe y pulsa Enter..."
                        className="flex-1 py-2 sm:py-3 px-2 bg-transparent focus:outline-none text-slate-700 font-medium placeholder-slate-400 w-full text-sm sm:text-base"
                        value={nuevaIdea}
                        onChange={(e) => setNuevaIdea(e.target.value)}
                    />
                    <button type="submit" className="bg-teal-500 hover:bg-teal-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold transition-colors flex items-center shadow-md shadow-teal-200 text-sm sm:text-base whitespace-nowrap">
                        Añadir <span className="hidden md:inline ml-1">Tarea</span>
                    </button>
                </form>

                <div className="flex-1 flex flex-col min-h-0 bg-slate-100 p-4 md:p-6 rounded-3xl border-2 border-dashed border-slate-300 relative shadow-inner overflow-hidden">
                    <div className="flex-1 overflow-y-auto w-full custom-scrollbar pr-2 pb-4">
                        {groupIdeas.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
                                <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                                    <Plus size={40} className="text-slate-300" />
                                </div>
                                <p className="font-medium text-lg text-center px-4">Añade tareas. Todos verán lo que escribes.</p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-4 items-start content-start">
                                {groupIdeas.map(idea => (
                                    <div
                                        key={idea.id}
                                        className={`${idea.color} ${idea.rotation} border p-4 sm:p-5 rounded-sm shadow-md w-full sm:w-64 min-h-[130px] relative group transition-transform hover:scale-105 hover:z-10 flex flex-col`}
                                    >
                                        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-3 bg-black/10 rounded-full blur-[1px]"></div>
                                        <p className="font-medium leading-snug mt-2 text-sm md:text-base flex-1">{idea.texto}</p>

                                        {/* Etiqueta de Autor colaborativo */}
                                        <div className="mt-2 text-[10px] font-bold opacity-60 flex justify-between items-center border-t border-black/10 pt-2">
                                            <span>Añadido por {idea.autor}</span>
                                            <button
                                                onClick={() => eliminarIdea(idea.id, idea.autorId)}
                                                className="p-1 hover:bg-black/10 rounded-full opacity-0 group-hover:opacity-100 transition-all text-red-700"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

            </div>
        </div>
    );

    const renderFase2 = () => (
        <div className="flex flex-col h-full space-y-6 animate-fade-in">
            <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 p-6 rounded-3xl shadow-lg text-white flex flex-col md:flex-row items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center"><Target className="mr-3 text-teal-400" /> Votación en Equipo</h2>
                    <p className="text-indigo-200 mt-1">Cualquier miembro puede seleccionar las 3 tareas finales para el grupo.</p>
                </div>
                <div className="mt-4 md:mt-0 bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-sm border border-white/20 flex items-center space-x-3">
                    <span className="text-sm font-medium text-indigo-200 uppercase tracking-wider">Seleccionadas</span>
                    <div className="flex space-x-1">
                        {[1, 2, 3].map(num => (
                            <div key={num} className={`w-3 h-3 rounded-full ${num <= ideasSeleccionadas.length ? 'bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]' : 'bg-indigo-950/50'}`}></div>
                        ))}
                    </div>
                    <span className="text-2xl font-bold ml-2">
                        {ideasSeleccionadas.length}/3
                    </span>
                </div>
            </div>

            <div className="flex-1 bg-slate-100/50 p-6 rounded-3xl border border-slate-200 overflow-y-auto">
                <div className="flex flex-wrap gap-6 justify-center">
                    {groupIdeas.map(idea => (
                        <div
                            key={idea.id}
                            onClick={() => toggleSeleccion(idea)}
                            className={`
                cursor-pointer w-full sm:w-72 min-h-[140px] p-5 rounded-2xl transition-all duration-300 relative
                ${idea.seleccionada
                                    ? 'bg-white ring-4 ring-teal-500 shadow-xl scale-105 z-10'
                                    : `${idea.color} opacity-80 hover:opacity-100 hover:shadow-md hover:-translate-y-1`}
              `}
                        >
                            {idea.seleccionada && (
                                <div className="absolute -top-4 -right-4 bg-teal-500 text-white p-2 rounded-full shadow-lg border-2 border-white">
                                    <Star size={20} fill="currentColor" />
                                </div>
                            )}
                            <div className="w-full h-full flex flex-col text-center">
                                <p className={`font-medium flex-1 ${idea.seleccionada ? 'text-slate-800' : ''}`}>{idea.texto}</p>
                                <p className="text-[10px] mt-2 opacity-60 font-bold border-t border-black/10 pt-2">De: {idea.autor}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderFase3 = () => (
        <div className="flex flex-col h-full space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center">
                <h2 className="text-2xl font-bold text-slate-800">Matriz de Priorización</h2>
                <p className="text-slate-500 mt-1">Acordad entre todos el Impacto y Viabilidad técnica. ¡Los cambios se sincronizan en vivo!</p>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto pb-6">
                {ideasSeleccionadas.length === 0 ? (
                    <div className="col-span-3 flex justify-center items-center text-slate-400 bg-slate-50 rounded-3xl border-2 border-dashed h-40">
                        Ninguna tarea seleccionada en la fase anterior.
                    </div>
                ) : (
                    ideasSeleccionadas.map((idea, index) => (
                        <div key={idea.id} className="bg-white rounded-3xl shadow-md border border-slate-100 flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                            <div className="bg-indigo-600 p-5 text-white flex items-start space-x-4">
                                <span className="bg-indigo-400/30 text-indigo-50 rounded-xl w-10 h-10 flex items-center justify-center font-bold text-lg shrink-0">
                                    #{index + 1}
                                </span>
                                <p className="font-semibold text-sm leading-snug pt-1">{idea.texto}</p>
                            </div>

                            <div className="p-6 flex-1 space-y-8 bg-slate-50/50">
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
                                        <Trophy size={16} className="mr-2 text-yellow-500" /> Beneficio / Impacto
                                    </label>
                                    <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200">
                                        {['Alto', 'Medio', 'Bajo'].map(val => (
                                            <button
                                                key={`ben-${val}`}
                                                onClick={() => actualizarMetrica(idea.id, 'beneficio', val)}
                                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${idea.beneficio === val
                                                    ? (val === 'Alto' ? 'bg-green-100 text-green-700' : val === 'Medio' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')
                                                    : 'text-slate-400 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
                                        <Target size={16} className="mr-2 text-blue-500" /> Esfuerzo / Complejidad
                                    </label>
                                    <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200">
                                        {['Alto', 'Medio', 'Bajo'].map(val => (
                                            <button
                                                key={`esf-${val}`}
                                                onClick={() => actualizarMetrica(idea.id, 'esfuerzo', val)}
                                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${idea.esfuerzo === val
                                                    ? (val === 'Alto' ? 'bg-red-100 text-red-700' : val === 'Medio' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700')
                                                    : 'text-slate-400 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    const renderFase4 = () => (
        <div className="flex flex-col h-full space-y-8 animate-fade-in overflow-y-auto pb-10 print:overflow-visible">
            <div className="relative bg-gradient-to-r from-teal-500 to-indigo-600 p-8 rounded-3xl shadow-xl text-white text-center overflow-hidden print:bg-white print:border-b-4 print:border-indigo-600 print:shadow-none print:text-slate-800">

                <div className="inline-flex items-center justify-center bg-white/20 p-3 rounded-2xl backdrop-blur-sm mb-4 print:bg-indigo-100">
                    <Trophy size={28} className="text-yellow-300 mr-3 print:text-indigo-600" />
                    <h2 className="text-xl font-bold tracking-widest uppercase print:text-indigo-900">Resultados del Equipo</h2>
                </div>
                <h3 className="text-4xl font-extrabold mb-2 print:text-black">{myGroup.nombre}</h3>
                <p className="text-teal-100 text-lg print:text-slate-500">Presentad vuestras tareas al resto. ¡Tenéis 1 minuto por idea!</p>

                <div className="mt-8 flex flex-wrap justify-center gap-4 print:hidden">
                    <button onClick={() => window.print()} className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-6 py-3 rounded-xl font-bold flex items-center transition-colors border border-white/30">
                        <Printer size={20} className="mr-2" /> Guardar PDF
                    </button>
                    <button onClick={exportarDatos} className="bg-teal-400 hover:bg-teal-300 text-indigo-900 px-6 py-3 rounded-xl font-bold flex items-center transition-colors shadow-lg">
                        <Download size={20} className="mr-2" /> Exportar TXT
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:grid-cols-1 print:gap-4 print:break-inside-avoid">
                {ideasSeleccionadas.map((idea, index) => {
                    const isQuickWin = idea.beneficio === 'Alto' && idea.esfuerzo === 'Bajo';
                    return (
                        <div key={idea.id} className="relative bg-white rounded-3xl shadow-lg border border-slate-100 flex flex-col overflow-hidden transform transition-all hover:-translate-y-2 hover:shadow-2xl print:shadow-sm print:border-2 print:border-slate-200 print:break-inside-avoid">
                            {isQuickWin && (
                                <div className="bg-gradient-to-r from-orange-400 to-yellow-400 text-white text-center py-2 font-bold text-sm tracking-widest flex justify-center items-center shadow-md z-10 print:bg-orange-100 print:text-orange-800">
                                    <CheckCircle size={16} className="mr-2" /> QUICK WIN
                                </div>
                            )}
                            <div className="p-8 flex-1 flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="bg-indigo-100 text-indigo-700 font-bold px-4 py-1.5 rounded-full text-sm">Idea #{index + 1}</span>
                                    {isQuickWin && <Star className="text-orange-400" fill="currentColor" size={24} />}
                                </div>
                                <p className="text-xl text-slate-800 font-semibold mb-8 flex-1 leading-snug">"{idea.texto}"</p>

                                <div className="grid grid-cols-2 gap-4 mt-auto">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 print:bg-white print:border-slate-200">
                                        <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider">Beneficio</span>
                                        <span className={`text-lg font-extrabold ${idea.beneficio === 'Alto' ? 'text-green-500' : idea.beneficio === 'Medio' ? 'text-yellow-500' : 'text-red-500'}`}>{idea.beneficio}</span>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 print:bg-white print:border-slate-200">
                                        <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider">Esfuerzo</span>
                                        <span className={`text-lg font-extrabold ${idea.esfuerzo === 'Bajo' ? 'text-green-500' : idea.esfuerzo === 'Medio' ? 'text-yellow-500' : 'text-red-500'}`}>{idea.esfuerzo}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden print:h-auto print:bg-white">

            {/* HEADER GLOBAL DEL TALLER */}
            <header className="bg-white shadow-sm border-b border-slate-200 px-4 md:px-6 py-4 shrink-0 z-50 print:hidden">
                <div className="flex flex-col lg:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-4">

                    <div className="flex items-center space-x-4 shrink-0 w-full lg:w-auto justify-between lg:justify-start">
                        <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-br from-indigo-500 to-teal-400 p-2 rounded-xl shadow-sm text-white">
                                <Bot size={24} />
                            </div>
                            <div>
                                <h1 className="text-lg font-extrabold text-slate-800 leading-tight truncate max-w-[150px]">{myGroup.nombre}</h1>
                                <p className="text-xs text-indigo-600 font-bold">{myProfile.nombre}</p>
                            </div>
                        </div>
                        {/* Botón salir en móvil */}
                        <button onClick={salirDelGrupo} className="lg:hidden text-slate-400 hover:text-red-500 p-2"><LogOut size={20} /></button>
                    </div>

                    <div className="flex-1 w-full flex justify-center">
                        <Stepper />
                    </div>

                    <div className="flex items-center space-x-2 md:space-x-4 shrink-0 w-full lg:w-auto justify-between lg:justify-end">
                        <button onClick={salirDelGrupo} className="hidden lg:flex items-center text-xs font-bold text-slate-400 hover:text-red-500 transition-colors mr-2">
                            <LogOut size={14} className="mr-1" /> Salir del grupo
                        </button>

                        {myGroup.faseActual > 0 && (
                            <div className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl font-mono text-lg md:text-xl font-bold shadow-inner border
                ${localTiempo <= 30 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-700'}
              `}>
                                <Clock size={20} className={localTiempo <= 30 && myGroup.faseActual < 4 ? 'animate-bounce' : ''} />
                                <span>{formatTime(localTiempo)}</span>
                            </div>
                        )}

                        {myGroup.faseActual < FASES.length - 1 && (
                            <button
                                onClick={avanzarFase}
                                disabled={myGroup.faseActual === 2 && ideasSeleccionadas.length !== 3}
                                className={`flex items-center px-4 md:px-5 py-2.5 rounded-xl font-bold transition-all
                  ${myGroup.faseActual === 2 && ideasSeleccionadas.length !== 3
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 hover:-translate-y-0.5'}`}
                            >
                                <span className="hidden sm:inline">Siguiente fase</span> <ChevronRight size={18} className="sm:ml-1" />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* CONTENIDO PRINCIPAL */}
            <main className="flex-1 p-4 md:p-8 overflow-hidden max-w-7xl mx-auto w-full print:overflow-visible print:p-0">
                {myGroup.faseActual === 0 && renderFase0()}
                {myGroup.faseActual === 1 && renderFase1()}
                {myGroup.faseActual === 2 && renderFase2()}
                {myGroup.faseActual === 3 && renderFase3()}
                {myGroup.faseActual === 4 && renderFase4()}
            </main>

        </div>
    );
}