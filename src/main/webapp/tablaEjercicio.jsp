<%-- 
    Document   : ejercicio
    Created on : 27 feb 2026, 9:37:02
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
        <link rel="stylesheet" href="css/tablaEjercicio.css">
    </head>
    <body>
        <%!
          private Connection conn;
          private PreparedStatement ps;
          private Statement st;
          private ResultSet rs;
          public void init(){
          conn=BD.getConexion();
          }
          
        %>
        <form action ="GestionadorXX" method="get">
        <h1>LISTA DE EJERCICIOS</h1>
        
        <%
            ArrayList<ejercicio> listaV=  (ArrayList<ejercicio>) request.getAttribute("listaV");
        %>
        <table border="3">
            <%

                if("alumno".equals(session.getAttribute("aRol"))){
                if (listaV != null && !listaV.isEmpty()) {
                for(int i=0; i<listaV.size(); i++){
                
                if (i%4==0){
            %>
            <tr>
            <%
                }
                ejercicio e= listaV.get(i);
                boolean complet = e.isCompletado();
                Date fechaE=e.getDate();
                Date hoy=new Date(System.currentTimeMillis());
                
            
                String color="";
                if(complet){
                    color = "#90EE90"; // verde
                }else if(e.isEval()){
                    if(fechaE != null && hoy.after(fechaE)){
                        color = "#FF0000"; // rojo (fuera de plazo)
                    }else{
                        color = "#FFFF00"; // amarillo (evaluable no completado)
                    }
                }
            %>
            <td style="background-color: <%= color %>; color: black;">
               
                <a href="detalleEjercicio.jsp?id=<%=e.getId()%>" style="display:block;"> Ejercicio <%= e.getId() %></a>
            </td>
            <%
                if(i%4==3){
            %>
            </tr>
            <%
                }
                }
                }
            %>
        </table><br><br>
        <input type="submit" name="btnSubmit" value="EVALUABLES" >
            <%
                }else if ("profesor".equals(session.getAttribute("aRol"))){
            %>
            <%
            ArrayList<ejercicioProf> listaP=  (ArrayList<ejercicioProf>) request.getAttribute("listaP");
            %>
        <table border="3">
            <%
                if (listaP != null && !listaP.isEmpty()) {
                for(int i=0; i<listaP.size(); i++){
                
                if (i%4==0){
            %>
            <tr>
            <%
                }
                ejercicioProf e= listaP.get(i);
                
                String color;
                if("no".equals(e.isVisible())){
                    color="#8A8787";
                }else if(e.isEval()){
                    color="#FFFF00";
                }else{
                    color="";
                }

            %>
             <td style="background-color: <%= color %>; color: black;">
                <a href="detalleEjercicio.jsp?id=<%=e.getId()%>" style="display:block;"> Ejercicio <%= e.getId() %></a>
            </td>
            <%
                if(i%4==3){
            %>
            </tr>
            <%
                }
                }
                }
            %>
        </table> <br><br>
        
            <a href="añadirEjercicio.jsp">
                <button class="btn-anadir" type="button">+ AÑADIR EJERCICIO</button>
            </a>
        
            <input type="submit" name="btnAnterior" value="PAGINA ANTERIOR" >
        
            <%
            }
            %>
        <input type="submit" name="btnSubmit" value="CERRAR SESION" >
        
        </form>
    </body>
</html>
