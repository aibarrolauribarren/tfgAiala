<%-- 
    Document   : añadirEjercicio
    Created on : 2 mar 2026, 11:26:57
    Author     : quick
--%>

<%@page import="packControl.ejercicioProf"%>
<%@page import="packControl.ejercicio"%>
<%@page import="java.lang.String"%>
<%@page import="java.util.ArrayList"%>
<%@page import="utils.BD"%>
<%@page import="java.sql.*"%>
<%@page import="java.sql.SQLException"%>
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
        <h1>Añadir nuevo ejercicio</h1>
        <%
            String error= (String)request.getAttribute("errorFecha");
            String error2= (String) request.getAttribute("fechaPronto");
            if(error!=null ){
        %>
        <p style="color:red; text-align:center; font-weight:bold; font-size:20px; margin-bottom:20px;"><%=error%></p>
        <%
            }else if(error2!=null){
        %>
        <p style="color:red; text-align:center; font-weight:bold; font-size:20px; margin-bottom:20px;"><%=error2%></p>
        <%
            }
        %>
        
        Ejercicio <input type="file" name="archivo" id="archivo" ><br><br><!-- comment -->
        <input type="checkbox" name="ejEvaluable" value="1" onclick="mostrarFecha(this)"> Ejercicio evaluable<br><br><!-- comment -->
        <div id="fechaContainer" style="display: none; margin-top:10px;">
            Fecha de entrega:
            <input type="date" name="fechaEntrega" id="fecha"><br><br>
        </div>
        
        <input type="submit" class="btnEjercicio" name="btnSubmit" value="EJERCICIO LISTO">
        
        <input type="submit" name="btnsubmit" value="PAGINA ANTERIOR" > 
        </form>
        <script>
            function mostrarFecha(radio){
                const container=document.getElementById('fechaContainer');
                if(radio.checked){
                    container.style.display ='block';
                }else{
                    container.style.display='none';
                }
            }
        </script>
        
    </body>
</html>
