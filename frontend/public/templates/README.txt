Plantillas Excel estaticas para descarga del frontend.

Como funciona
-------------
Vite sirve todo lo que esta en `public/` como archivo estatico desde la raiz
del sitio. Por eso un archivo en esta carpeta queda accesible en:

  /templates/<nombre_del_archivo>.xlsx

Archivos esperados
------------------
- plantilla_colaboradores.xlsx
    Lo descarga el dialogo "Importar Colaboradores" cuando el usuario hace
    click en "Descargar Plantilla". Si no existe (404), el codigo cae a un
    fallback que genera la plantilla en runtime con la libreria xlsx.

Como agregar / actualizar una plantilla
---------------------------------------
1. Armas tu Excel en tu maquina (Excel, LibreOffice, Google Sheets export):
   - Headers obligatorios en la primera fila:
     primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
     tipo_documento, documento, fecha_nacimiento, cargo, modalidad_pago,
     salario_base, fecha_ingreso
   - Una fila de ejemplo o vacia debajo, lo que prefieras.
   - Podes agregar validaciones, colores, hojas con instrucciones, etc.
2. Guardas el archivo como `.xlsx`.
3. Lo pegas en esta carpeta con el nombre exacto que espera el codigo
   (ver la constante `PLANTILLA_URL` en ImportarColaboradoresDialog.tsx).
4. Listo: al recargar el frontend el boton "Descargar Plantilla" sirve tu
   archivo en vez de generarlo desde codigo.

Importante
----------
- Los nombres de las columnas (case-sensitive, con guion bajo) deben coincidir
  con lo que el parser del dialogo espera. Si renombras una columna en el
  Excel, hay que actualizar el codigo tambien.
- Tamaño maximo aceptado por el dialogo al subirlo: 5 MB.
