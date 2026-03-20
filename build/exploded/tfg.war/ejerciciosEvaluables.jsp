<%-- 
    Document   : ejerciciosEvaluables
    Created on : 8 mar 2026, 19:04:20
    Author     : quick
--%>
<%@page import="packControl.ejercicioEvalAlum"%>
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
        <title>Ejercicios Evaluables</title>
        <link rel="stylesheet" href="css/ejercicioEvaluables.css">
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
        <form action="Gestionador" method="get">
            <%
            ArrayList<ejercicioEvalAlum> listaEjer=  (ArrayList<ejercicioEvalAlum>) request.getAttribute("listaEjerciciosA");
            %>
            <h1>Ejercicios evaluables</h1>
            <table border="2" class="tabla-ejercicios">
                <tr>
                    <th>Ejercicio</th> <th>Fecha de entrega</th> <th>Completado</th>
                </tr>
                <%
                    for(int i=0; i<listaEjer.size(); i++){
                    ejercicioEvalAlum e= listaEjer.get(i);
                %>
                <tr>
                    <td>
                        <a href="detalleEjercicio.jsp?id=<%=e.getId()%>" style="display:block;"> Ejercicio <%= e.getId() %></a>                       
                    </td>
                    <td>
                        <%=e.getDate()%>
                    </td>
                    
                        <%
                            boolean complet= e.getComplet();
                            Date fechaE=e.getDate();
                            Date hoy=new Date(System.currentTimeMillis());
                            String color="";
          
                            if(complet == true && fechaE.after(hoy) || hoy.after(fechaE) && complet == true){
                                    color="#90EE90";
                            }else if(hoy.after(fechaE) && complet == false){
                                    color = "#FF0000";
                            }else{
                                    color="";
                            }
                                    
                        %>
                        
                            <td style="background-color: <%= color %>; color: black;">                               
                            </td>
                       
                </tr>
                <%
                    }
                %>
            </table>
            <input type="submit" name="btnSubmit" value="CERRAR SESION" >
            
            <input type="submit" name="btnsubmit" value="TABLA EJERCICIOS" >
        </form>
    </body>
</html>
