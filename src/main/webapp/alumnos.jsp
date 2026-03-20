<%-- 
    Document   : alumnos
    Created on : 6 mar 2026, 12:07:49
    Author     : quick
--%>

<%@page import="java.util.ArrayList"%>
<%@page import="packControl.ejercicioEval"%>
<%@page import="utils.BD"%>
<%@page import="java.sql.PreparedStatement"%>
<%@page import="java.sql.*"%>
<%@page import="java.sql.Date"%>
<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Alumnos</title>
        <link rel="stylesheet" href="css/alumnos.css">
    </head>
    <body>
        <form action="Gestionador" method="get">
        <%!
          private Connection conn;
          private PreparedStatement ps;
          private PreparedStatement ps3;
          private Statement st;
          private ResultSet rs;
          private Statement st2;
          private ResultSet rs2;
          private ResultSet rs3;
          public void init(){
          conn=BD.getConexion();
          }
         %>
         <%  
            Date hoy = new Date(System.currentTimeMillis());
            ArrayList<ejercicioEval> ejerEval = new ArrayList<>();
          
             try{
                String sql2 = "Select id, fechaEntrega from ejercicio where evaluable = true";
                st2=conn.createStatement();
                rs2=st2.executeQuery(sql2);
                while(rs2.next()){
                    int idE=rs2.getInt("id");
                    Date fecha=rs2.getDate("fechaEntrega");
                    ejerEval.add(new ejercicioEval(idE, fecha));
                }
                
            }catch(SQLException ex){
                ex.printStackTrace();
            }

          
        %>
        <h1>Lista de alumnos:</h1>
        <div class="table-container">
        <table border="2" class="table1">
            <tr>
                <th>Alumnos</th> <th>Ejercicios evaluables</th>
            </tr>
            
                
                    <%
                        try{
                        String sql = "Select id,nombre, apellido from usuario where rol = 'alumno'";
                        st=conn.createStatement();
                        rs=st.executeQuery(sql);
                        while(rs.next()){
                        String nombre=rs.getString("nombre");
                        String apellido=rs.getString("apellido");
                        int id=rs.getInt("id");
                    %>
                    <tr>
                        <td>  <%=nombre%> <%=apellido%></td>
                        <td>
                            <table border="1" class="table2">
                                <%
                                    
                                    for(int i=0; i<ejerEval.size(); i++){
                                    ejercicioEval e= ejerEval.get(i);
                                    
                                    int idEjer=e.getId();
                                    
                                    try{
                                        String color="";
                                        String sql3="select completado, fechaEntrega from usuejer as ue inner join ejercicio as e on ue.idEj=e.id where e.visibilidad='yes' and ue.idUsu=? and ue.idEj=?";
                                        ps3=conn.prepareStatement(sql3);
                                        ps3.setInt(1, id);
                                        ps3.setInt(2, idEjer);
                                        rs3=ps3.executeQuery();
                                        while(rs3.next()){
                                        Date fech=rs3.getDate("fechaEntrega");
                                        boolean complet = rs3.getBoolean("completado");
                                        
                                        if(complet == true && fech.after(hoy) || hoy.after(fech) && complet == true){
                                            color="#90EE90";
                                        }else if(hoy.after(fech) && complet == false){
                                            color = "#FF0000";
                                        }else{
                                            color="";
                                        }
                                    
                                        %>
                                        <td style="background-color: <%= color %>; color: black;">
                                            <a href="ejercicioResuelto.jsp?id=<%=e.getId()%>" style="display:block;"> <%= e.getId() %></a>
                                        </td>
                                        <%
                                     }
                                    }catch(SQLException ex){
                                        ex.printStackTrace();
                                    }
                                    }
                                    
                                %>
                            </table>
                        </td>
                    </tr>   
                    <%
                        }
                        }catch(SQLException ex){
                            ex.printStackTrace();
                        }
                    %>
                    <tr>
                        
                    </tr>
            
        </table>
        </div>
        <input type="submit" name="btnSubmit" value="CERRAR SESION" >
       <input type="submit" name="btnAnterior" value="PAGINA ANTERIOR" >
        </form>
    </body>
</html>
