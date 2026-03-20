/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/JSP_Servlet/Servlet.java to edit this template
 */
package packControl;

import jakarta.servlet.ServletConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.sql.Connection;
import java.sql.*;
import utils.BD;



/**
 *
 * @author quick
 */

public class Controlador extends HttpServlet {
    private Connection con;
    private PreparedStatement ps;
    private Statement st;
    private ResultSet rs;
    /**
     * Processes requests for both HTTP <code>GET</code> and <code>POST</code>
     * methods.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */

     public void init(ServletConfig cfg) throws ServletException{
     con = BD.getConexion();
    }

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String pEmail = request.getParameter("txtEmail");
        String pContr = request.getParameter("txtPassword");
        HttpSession session = request.getSession();
        
        try{
            String uql= "Select * from usuario where email =? and contrasenia=?";
            ps= con.prepareStatement(uql);
            ps.setString(1, pEmail);
            ps.setString(2, pContr);
            rs=ps.executeQuery();
            if(rs.next()){
                String nombre= rs.getString("nombre");
                int id = rs.getInt("id");
                String rol = rs.getString("rol");
                session.setAttribute("aNombre", nombre);
                session.setAttribute("aRol", rol);
                session.setAttribute("aId", id);
              //  request.getRequestDispatcher("ejercicio.jsp").forward(request,response);
              response.sendRedirect("Gestionador");
            }else{
                String error="Email o contrasenia incorrectas";
                response.sendRedirect("index.jsp?error= " + error);
            }
        }catch(SQLException ex){
            ex.printStackTrace();
        }
        
        }
    

    // <editor-fold defaultstate="collapsed" desc="HttpServlet methods. Click on the + sign on the left to edit the code.">
    /**
     * Handles the HTTP <code>GET</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /**
     * Handles the HTTP <code>POST</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /**
     * Returns a short description of the servlet.
     *
     * @return a String containing servlet description
     */
    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

}
