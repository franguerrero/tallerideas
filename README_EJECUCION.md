# Ejecución en Local - Taller de Ideas

Sigue estos pasos detallados para ejecutar la aplicación en tu propio equipo correctamente.

## 1. Requisitos Previos (Variables de Entorno Base)
Dado que estás usando versiones de programas *portables*, para que tu terminal (PowerShell) los reconozca, **siempre debes ejecutar este comando cada vez que abras una nueva ventana de terminal** en este proyecto:

```powershell
$env:PATH += ";C:\100_PROGRAMAS_PORTABLE\node-v24.11.1-win-x64"
```

Si además vas a usar Git (para subir a github), el comando completo sería:
```powershell
$env:PATH += ";C:\100_PROGRAMAS_PORTABLE\node-v24.11.1-win-x64;C:\100_PROGRAMAS_PORTABLE\PortableGit\bin"
```

## 2. Configurar Firebase (Solución al Error "auth/invalid-api-key")

Acabas de encontrarte con el error `Firebase: Error (auth/invalid-api-key)`. Esto ocurre porque no le hemos indicado a la aplicación a qué base de datos de Firebase debe conectarse.

Para solucionarlo, hemos separado la configuración en **Variables de Entorno** (una muy buena práctica de seguridad). 

### Pasos para añadir tus claves:
1. En esta misma carpeta (`tallerideas/tallerideas`), crea un archivo nuevo llamado exactamente **`.env`** (con el punto delante y sin extensión).
2. Abre el archivo **`.env.example`** que ya existe, copia todo su contenido y pégalo en el nuevo archivo `.env` que acabas de crear.
3. Rellena los valores entre comillas con las claves reales de tu proyecto de Firebase. Debería quedar algo así:

   ```env
   VITE_FIREBASE_API_KEY="AIzaSyA-ejemplo-clave-12345"
   VITE_FIREBASE_AUTH_DOMAIN="tu-proyecto.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="tu-proyecto"
   VITE_FIREBASE_STORAGE_BUCKET="tu-proyecto.appspot.com"
   VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
   VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
   ```

*(Si no tienes un proyecto de Firebase aún, ve a [console.firebase.google.com](https://console.firebase.google.com/), crea uno nuevo, y en la configuración del proyecto añade una "Aplicación Web" `</>` para que te dé estas claves).*

> ⚠️ **IMPORTANTE:** Debes ir a la sección **Authentication** en tu consola de Firebase > **Sign-in method** > Añadir proveedor nuevo: **Anónimo**. ¡Asegúrate de que esté habilitado! (Si no, fallará el inicio de sesión).
> Además, asegúrate de crear la base de datos en **Firestore Database** e iniciarla en Modo de Prueba.

## 3. Levantar el servidor de Desarrollo

Una vez creado tu archivo `.env` con los datos de Firebase, abre tu terminal en esta carpeta y ejecuta este comando para levantar la web:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; npm run dev
```

*(El `Set-ExecutionPolicy` es necesario para saltarse temporalmente la seguridad de Windows que impedía ejecutar el script `npm.ps1`).*

## 4. Desplegar a Vercel

Cuando hayas comprobado en `http://localhost:5173` que ya funciona, puedes subirlo a producción. Vercel también necesita conocer esas variables de entorno.

### Opción A (Recomendada): Vía web de Vercel
1. Entra en el panel de Vercel de tu proyecto.
2. Ve a **Settings > Environment Variables**.
3. Añade una a una las variables del `.env` (VITE_FIREBASE_API_KEY, etc.) asociadas a sus valores.
4. Una vez guardadas, haz un nuevo deploy.

### Opción B: Vía terminal
Si lo haces por consola, puedes usar un archivo .env si lo fuerzas. Pero la Opción A es la estándar y más segura.
