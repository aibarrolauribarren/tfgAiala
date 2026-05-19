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
        /*  public void init(){
          conn=BD.getConexion();
          }*/

          
        %>
        
           <%
            String idEjercicio = request.getParameter("id");
            int idE = 0;
            if (idEjercicio != null) {
                idE = Integer.parseInt(idEjercicio);
                try {
                conn=BD.getConexion();
                    String uql = "SELECT e.*, ue.completado FROM ejercicio e " +
                                 "LEFT JOIN usuejer ue ON e.id = ue.idEj AND ue.idUsu = ? " +
                                 "WHERE e.id = ?";
                    
                    ps = conn.prepareStatement(uql);
                    // Si no hay usuario en sesión ponemos 0 para que no rompa la query, aunque siempre debería haberlo
                    ps.setInt(1, (Integer) session.getAttribute("aId"));
                    ps.setInt(2, idE);
                    rs = ps.executeQuery();
            %>
            <h1>Ejercicio <%=idE %></h1>
                           
            <%
                    if (rs.next()) {
                        boolean esEvaluable = rs.getBoolean("evaluable");
                        String visibilidad = rs.getString("visibilidad");
                        Date fechaEntrega = rs.getDate("fechaEntrega"); 
                        boolean completado = rs.getBoolean("completado");

                        // 🛑 CONTROL DE BLOQUEO: Si es alumno, es evaluable, ha pasado la fecha y NO lo completó...
                        if ("alumno".equals(session.getAttribute("aRol")) && esEvaluable && fechaEntrega != null) {
                            java.sql.Date hoy = new java.sql.Date(System.currentTimeMillis());
                            
                            if (fechaEntrega.before(hoy) && !completado) {
        %>
                                <div style="text-align: center; margin-top: 100px; font-family: 'Segoe UI', sans-serif; color: #333;">
                                    <div style="font-size: 60px; color: #dc3545; margin-bottom: 20px;">⏳</div>
                                    <h1 style="color: #dc3545;">Plazo de entrega caducado</h1>
                                    <p style="font-size: 18px; color: #29120E; max-width: 500px; margin: 0 auto 30px auto;">
                                        Lo sentimos, la fecha límite para realizar este ejercicio evaluable era el <strong><%= fechaEntrega %></strong> y no se registró ninguna entrega a tiempo.
                                    </p>
                                    <a href="Gestionador?submit=EJERCICIOS" style="display: inline-block; padding: 12px 24px; background-color: #00008B; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                        Volver a la lista de ejercicios
                                    </a>
                                </div>
        <%
                                // El return corta el renderizado. Todo lo que hay abajo de este punto NO SE MOSTRARÁ
                                return; 
                            }
                        }
            %>
                        <script>
                            window.esEvaluable = <%= esEvaluable %>;
                            console.log("¿Es examen?:", window.esEvaluable);
                        </script>

                        <input type="hidden" name="id" value="<%=idE%>">
                    
                    
                    <%-- INICIO BLOQUE PROFESOR --%>
                    <% if("profesor".equals(session.getAttribute("aRol"))){ %>
                    
                    
                    
                    <% if(esEvaluable){%>
                        <h4 class="fecha-entrega" >ÚLTIMO DÍA PARA LA ENTREGA ES <%= fechaEntrega%></h4><br><br>
                    <%}%>
        
                        <div class="profesor-buttons">
                            <input type="submit" name="submit" value="ELIMINAR EJERCICIO">
                            
                            <% if ("no".equals(visibilidad)) { %>
                                <input type="submit" name="submit" value="PUBLICAR EJERCICIO">
                            <% } %>

                            <% if (esEvaluable) { %>
                            
                                <button type="button" onclick="mostrarFecha()">CAMBIAR LA FECHA DE ENTREGA</button>
                                <div id="fechaContainer" style="display:none">
                                    <label>Nueva fecha de entrega:</label>
                                    <input type="date" name="nuevaFecha" value="<%= (fechaEntrega != null ? fechaEntrega.toString().substring(0,10) : "") %>">
                                    <input type="submit" name="accion" value="confirmarFecha" style="background-color: #28a745; color:white;">
                                </div>
                            <% } %>
                        </div> <%-- Cierre de profesor-controls --%>
                   
                    <%-- FIN BLOQUE PROFESOR --%>

                    <script>
                        function mostrarFecha() {
                            const container = document.getElementById('fechaContainer');
                            container.style.display = (container.style.display === 'none' || container.style.display === '') ? 'block' : 'none';
                        }
                    </script>
        <%
                    }//es profesor
                } // Cierre de if (rs.next())
            } catch (SQLException ex) {
                ex.printStackTrace();
            }
        } // Cierre de if (idEjercicio != null)
        %>
            
            <input type="submit" name="btnsubmit" value="TABLA EJERCICIOS" >
      
             </form> 
         
        <div id="container">
            <div id="erd_container"></div>
            <div id="relational_container">
                <div id="schemaContainer"></div>
                <div id="newRelation" class="button clickable">+ Relación</div>

                <div id="bottomButtons">
                    <div id="mapCheck" class="button clickable">Comprobar</div>

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
