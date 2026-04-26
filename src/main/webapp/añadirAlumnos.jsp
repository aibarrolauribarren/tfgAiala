<%-- 
    Document   : añadirAlumnos
    Created on : 26 abr 2026, 12:28:34
    Author     : quick
--%>

<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Modelo Relacional</title>
       <link rel="stylesheet" href="css/añadirEjercicio.css">
    </head>
    <body>
    <form action="Gestionador" method="post" enctype="multipart/form-data">            
        <h1>Añadir alumnos</h1>
        <input type="file" name="archivoAlumnos" id="archivoAlumnos" ><br><br><!-- comment -->
         
        <input type="submit" class="btnEjercicio" name="btnSubmit" value="ALUMNOS LISTOS">
        
        <input type="submit" name="btnsubmit" value="PAGINA ANTERIOR" > 
        </form>
        
        
    </body>

</html>
