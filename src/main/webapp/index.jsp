<%-- 
    Document   : index
    Created on : 27 feb 2026, 9:34:42
    Author     : quick
--%>

<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Modelo Relacional</title>
       <link rel="stylesheet" href="css/index.css">
    </head>
    <body>
        <div class="login-container">
        <h1>Login</h1>
        <form action="ControladorXX" method="get">
            <label for=txtEmail">Email:</label>
            <input type="text" id="txtEmail" name="txtEmail"><br><br><!-- comment -->
          <label for=txtEmail">Contraseña:</label>
          <input type="password" id="txtPassword" name="txtPassword"><br><br><!-- comment -->
          <input type="submit" name="submit" value="IDENTIFICAR"><br><br><!-- comment -->
          <input type="reset" value="BORRAR">
        </form>
        
        <%
            if(request.getParameter("error")!=null){
        %>
        <h2 class="error" ><%=request.getParameter("error")%></h2>
        <%
            }
        %>
        </div>
    </body>
</html>
