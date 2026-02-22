# Taller de Ideas - Aplicación Colaborativa

Una aplicación web interactiva y en tiempo real diseñada para facilitar talleres de lluvia de ideas (brainstorming), priorización y toma de decisiones para equipos y alumnos online.

Esta herramienta permite a múltiples equipos trabajar de forma simultánea pero aislada, garantizando que cada grupo tenga su propio espacio de trabajo privado.

## 🚀 Características Principales

Basado en los requerimientos iniciales, la aplicación incorpora las siguientes funcionalidades:

- **Multijugador en Tiempo Real**: Sincronización instantánea de las acciones de los usuarios (añadir ideas, votar, cambiar métricas) usando Firebase.
- **Gestión de Equipos (Grupos)**: Los alumnos pueden ingresar (con nombre o alias) y crear o unirse a un equipo de trabajo específico. Los datos están aislados; un equipo no puede ver las ideas de los demás.
- **Fases del Taller Estructuradas**:
  1. **Arranque**: Sala de espera (Lobby) para agrupar al equipo y esperar a todos los miembros.
  2. **Lluvia de Ideas**: Los participantes añaden sus ideas (estilo post-it de colores) al tablero del grupo.
  3. **Selección**: Votación en equipo para escoger las 3 ideas o tareas más relevantes.
  4. **Priorización**: Matriz de esfuerzo/beneficio para catalogar las ideas seleccionadas y descubrir *Quick Wins* (Alto Beneficio / Bajo Esfuerzo).
  5. **Puesta en común**: Visualización final de los resultados presentables al supervisor o al resto de la clase.
- **Persistencia de Datos**: Toda la información del taller se guarda de forma segura en una base de datos en la nube (Firebase Firestore), evitando la pérdida de información accidental.
- **Exportación e Informes**: Capacidad para generar y descargar un informe en formato `.TXT` de los resultados del equipo o imprimir el documento directamente a un PDF.

## 🛠️ Tecnologías Utilizadas

La aplicación está construida en un único componente robusto (`App.jsx`) utilizando un stack moderno:

- **Frontend**: [React](https://reactjs.org/) (Componentes funcionales y Hooks para gestión del estado local y global).
- **Estilos e Interfaz**: [Tailwind CSS](https://tailwindcss.com/) para un diseño responsivo y moderno; y [Lucide React](https://lucide.dev/) para la iconografía intuitiva.
- **Backend y Persistencia**: [Firebase](https://firebase.google.com/)
  - **Firebase Auth**: Autenticación anónima para que los alumnos ingresen sin necesidad de registro complejo.
  - **Firestore**: Base de datos NoSQL en tiempo real para mantener sincronizados a todos los usuarios del grupo al instante.

## 📦 Cómo ejecutarlo y desplegarlo

Para responder a la pregunta: *"este codigo donde lo puedo subir para ejecutarlo?"*

Dado que ahora mismo tienes el código fuente del componente (`App.jsx`), necesitas empaquetarlo en un proyecto de React estándar. La forma más recomendada hoy en día es usar **Vite**.

### 1. Inicializar el proyecto en local
Si no lo has hecho ya, en tu terminal o línea de comandos ejecuta:

```bash
# 1. Crear un nuevo proyecto React con Vite
npm create vite@latest taller-ideas -- --template react

# 2. Entrar a la carpeta autogenerada
cd taller-ideas

# 3. Instalar las dependencias base de React
npm install

# 4. Instalar las dependencias específicas de esta app
npm install firebase lucide-react

# 5. Instalar Tailwind CSS para los estilos
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Luego, reemplaza el contenido de `src/App.jsx` por el código que has generado en este repositorio y asegúrate de configurar bien `tailwind.config.js`.

### 2. Configurar Firebase
Deberás crear un proyecto gratuito en la [consola de Firebase (Google)](https://console.firebase.google.com/):
1. Activar **Firestore Database** (crear en "Modo Prueba" para empezar rápido).
2. Activar **Authentication** (habilitar proveedor "Anónimo").
3. Obtener tu configuración web de Firebase (`firebaseConfig`) de los ajustes del proyecto para inyectarlo en la aplicación.

### 3. Ejecución local
Para probar la aplicación en el ordenador antes de subirla, se arranca el servidor de desarrollo:
```bash
npm run dev
```

### 4. Despliegue para los alumnos (Online)
Una vez que el proyecto funcione en tu computadora local, puedes subirlo a internet para que los alumnos lo usen. Las mejores opciones gratuitas y sencillas para proyectos Frontend como este son:

- **Vercel** (Recomendado): Muy fácil de usar. Te creas una cuenta, conectas tu repositorio de GitHub donde está subido el proyecto, e importas. Vercel detecta que es Vite y lo despliega automáticamente dándote un enlace público.
- **Netlify**: Funciona de manera idéntica a Vercel, excelente integración con repositorios Git.
- **Firebase Hosting**: Dado que ya estás usando Firebase para la base de datos, puedes habilitar "Hosting" en tu consola de Firebase y desplegar el frontend en la misma plataforma usando la herramienta de comandos `firebase deploy`.
