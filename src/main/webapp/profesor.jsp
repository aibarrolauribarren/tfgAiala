<%-- 
    Document   : profesor
    Created on : 6 mar 2026, 11:31:16
    Author     : quick
--%>

<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Gestión</title>
        <link rel="stylesheet" href="css/profesor.css">
    </head>
    <body>
        <H1 class="titulo"> GESTIÓN DE:</H1>
        <form action="Gestionador" method="get" class="contenedor">
            <input type="submit" name="submit" value="EJERCICIOS" class="boton"><BR><BR><!-- comment -->
            <input type="submit" name="submit" value="ALUMNOS" class="boton"><BR><BR>
            <input type="submit" name="btnSubmit" value="CERRAR SESION" >
               
        </form>
    </body>
</html>
