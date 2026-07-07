#!/bin/bash

# Script de instalación para ARIA Converter en Debian/Peppermint
# Este script instala la aplicación con icono en el menú de aplicaciones

echo "Instalando ARIA Converter..."

# Verificar si se ejecuta como root
if [ "$EUID" -ne 0 ]; then 
    echo "Por favor ejecuta como root (sudo ./install.sh)"
    exit 1
fi

# Crear directorio de instalación
mkdir -p /opt/aria-converter

# Copiar archivos de la aplicación
cp -r * /opt/aria-converter/

# Copiar icono PNG
cp icon.png /opt/aria-converter/

# Copiar archivo .desktop
cp aria-converter.desktop /usr/share/applications/

# Dar permisos de ejecución
chmod +x /opt/aria-converter/node_modules/.bin/electron
chmod 644 /usr/share/applications/aria-converter.desktop

# Actualizar base de datos de iconos
update-desktop-database /usr/share/applications/

echo "ARIA Converter instalado exitosamente."
echo "Puedes encontrar la aplicación en el menú de aplicaciones."
