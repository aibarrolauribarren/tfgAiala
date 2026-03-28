<%-- 
    Document   : detalleEjercicio
    Created on : 2 mar 2026, 16:47:55
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
        <link rel="stylesheet" href="css/detEjer.css">
        <link rel="stylesheet" href="css/detalleEjercicio.css">
        <script src="https://cdn.jsdelivr.net/npm/@joint/core@4.0.4/dist/joint.js"></script>

        <title>Modelo Realcional</title>
    </head>
    <body>
        <form action="Gestionador" method="get">
        <%!
          private Connection conn;
          private PreparedStatement ps;
          private Statement st;
          private ResultSet rs;
          public void init(){
          conn=BD.getConexion();
          }
          
        %>
        
            <%
                
                String idEjercicio= request.getParameter("id");
                int idE=0;
                
                if(idEjercicio!=null){
                idE=Integer.parseInt(idEjercicio);

                
                try{
                String uql= "select * from ejercicio where visibilidad= 'no' and id=?";
                ps=conn.prepareStatement(uql);
                ps.setInt(1,idE);
                rs=ps.executeQuery();
                
                if(rs.next()){
                %>
                <input type="hidden" name="id" value="<%=idE%>"><br><br>
                <input type="submit" name="submit" value="PUBLICAR EJERCICIO"><br><br>
                <%
                    }
                }catch(SQLException ex){
                    ex.printStackTrace();      
                }
                }

                try{
                String uql= "select * from ejercicio where visibilidad= 'yes' and id=?";
                ps=conn.prepareStatement(uql);
                ps.setInt(1,idE);
                rs=ps.executeQuery();
                %>
                 <h1>  Ejercicio <%=idE %></h1>
                <%
                if(rs.next()){
                %>
                <input type="hidden" name="id" value="<%=idE%>"><br><br>
                
                <%
                    if ("profesor".equals(session.getAttribute("aRol"))){
                 %>   
                <input type="submit" name="submit" value="VER SOLUCION"><br><br>
                <%
                    }
                %>
                <%
                    }
                }catch(SQLException ex){
                    ex.printStackTrace();      
                
                }
            %>
            
            <input type="submit" name="btnsubmit" value="TABLA EJERCICIOS" >
           
        </form>  
                    <div id="container">
            <div id="erd_container"></div>
            <div id="relational_container">
                <div id="schemaContainer">
                </div>
                <div id="newRelation" class="button clickable">+ Relación</div>
                <%--<div id="mapCheck" class="button clickable">Comprobar</div>--%>
                <div id="bottomButtons">
                    <div id="mapCheck">Comprobar</div>
                    <button id="btnSiguiente" style="display:none;">
                        Siguiente ejercicio
                    </button>
                </div>
            </div>
        </div>
        <template id="relation_template">
            <div class="relation">
                <div class="relationName"></div>
                <div class="relationStructure">
                    <div class="newAttribute clickable">+</div>
                </div>
                <div class="fk_list"></div>
            </div>
        </template>
        <template id="attribute_template">
            <div class="attribute">
                <div class="attributeName"></div>
            </div>
        </template>
        <template id="fk_template">
            <div class="fk">
                <div class="fk_marker"></div>
                <div class="fk_text"></div>
            </div>
        </template>
        <template id="relation_actions_template">
            <div class="relationActionsContainer">
                <div class="actionButton editAction">✏️</div>
                <div class="actionButton deleteAction">❌</div>
            </div>
        </template>
        <template id="attribute_actions_template">
            <div class="attributeActionsContainer top_actions">
                <div class="actionButton editAction">✏️</div>
                <div class="actionButton deleteAction">❌</div>
            </div>
            <div class="attributeActionsContainer bottom_actions">
                <div class="actionButton pkAction">🗝️</div>
                <div class="actionButton fkAction">↩️</div>
            </div>
        </template>
        <template id="fk_actions_template">
            <div class="fkActionsContainer">
                <div class="actionButton deleteAction">❌</div>
            </div>
        </template>
        <template id="toast_template">
            <div class="mapping_result_toast">
                <%--<img class="toast_result_icon">--%> 
                <div class="toast_message"></div>
            </div>
        </template>
        <script type="module" src="./js/editor.js" defer></script>
        
    </body>
</html>
