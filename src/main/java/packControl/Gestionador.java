/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/JSP_Servlet/Servlet.java to edit this template
 */
package packControl;

import jakarta.servlet.ServletConfig;
import java.io.IOException;
import java.io.PrintWriter;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.Part;
import java.io.File;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import utils.BD;

/**
 *
 * @author quick
 */
@WebServlet(name = "Gestionador", urlPatterns = {"/Gestionador"})
public class Gestionador extends HttpServlet {
private Connection con;
    private PreparedStatement ps;
    private Statement st;
    private ResultSet rs;
    
     public void init(ServletConfig cfg) throws ServletException{
     con = BD.getConexion();
    }
    /**
     * Processes requests for both HTTP <code>GET</code> and <code>POST</code>
     * methods.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        HttpSession session = request.getSession();
        System.out.println("request " + request.getMethod());
        System.out.println(request);
        if("CERRAR SESION".equals(request.getParameter("btnSubmit"))){
            session.invalidate();
            response.sendRedirect("index.jsp");
            return;
        }
        if("AÑADIR EJERCICIO".equals(request.getParameter("btnSubmit"))){
            
            response.sendRedirect("añadirEjercicio.jsp");
            return;
        }
        if("TABLA EJERCICIOS".equals(request.getParameter("btnsubmit"))){
            
            response.sendRedirect("Gestionador");
            return;
        }
        if("PAGINA ANTERIOR".equals(request.getParameter("btnsubmit"))){
            
            response.sendRedirect("Gestionador?submit=EJERCICIOS");
            return;
        }
        
        if("ALUMNOS".equals(request.getParameter("submit"))){
            response.sendRedirect("alumnos.jsp");
            return;
        }
        
        if("PAGINA ANTERIOR".equals(request.getParameter("btnAnterior"))){
            response.sendRedirect("profesor.jsp");
            return;
        }
        
        if("PUBLICAR EJERCICIO".equals(request.getParameter("submit"))){
            String idEj=request.getParameter("id");
            int idE= Integer.parseInt(idEj);
            try{
            String sql = "update ejercicio set visibilidad = 'yes' where id=? ";
            ps=con.prepareStatement(sql);
            ps.setInt(1, idE);
            int x=ps.executeUpdate();
            if(x>0){
                System.out.println("visibilidad YES");
            }
            }catch(SQLException ex){
                ex.printStackTrace();
            }
            response.sendRedirect("Gestionador");
            
            return;
            
        }
        
        if("EJERCICIOS".equals(request.getParameter("submit"))){
             ArrayList<ejercicioProf> listaP = new ArrayList<>();
            try{
            String uql2= "Select * from ejercicio" ;
            st=con.createStatement();
            rs=st.executeQuery(uql2);
            while(rs.next()){
                String visibilidad = rs.getString("visibilidad");
                int idEP= rs.getInt("id");
                boolean eval=rs.getBoolean("evaluable");
               listaP.add(new ejercicioProf(idEP,visibilidad, eval));
                
            }
            }catch(SQLException ex){
             ex.printStackTrace();   
            }
            request.setAttribute("listaP", listaP);
            
            request.getRequestDispatcher("tablaEjercicio.jsp").forward(request,response);
            return;
        }
        
        
       if("EVALUABLES".equals(request.getParameter("btnSubmit"))){
            
            int usuId= (Integer) session.getAttribute("aId");
            ArrayList<ejercicioEvalAlum> ejerciciosEA = new ArrayList<>();
            try{
                String sql="Select e.id, e.fechaEntrega, ue.completado from ejercicio as e inner join usuejer as ue on e.id=ue.idEj where evaluable= true and idUsu =?  and visibilidad='yes'";
                ps=con.prepareStatement(sql);
                ps.setInt(1,usuId);
                rs=ps.executeQuery();
                while(rs.next()){
                    int idE=rs.getInt("id");
                    Date fechaE = rs.getDate("fechaEntrega");
                    boolean completE=rs.getBoolean("completado");
                    ejerciciosEA.add(new ejercicioEvalAlum(idE, fechaE, completE));
                    
                        
                    
                }
                request.setAttribute("listaEjerciciosA", ejerciciosEA);
            request.getRequestDispatcher("ejerciciosEvaluables.jsp").forward(request,response);
                
            }catch(SQLException ex){
                ex.printStackTrace();
            }
            
        }
        
        if("EJERCICIO LISTO".equals(request.getParameter("btnSubmit"))){
            String uploadPath = getServletContext().getRealPath("") + File.separator + "uploads";
            File uploadDir = new File(uploadPath);
            
            System.out.println("la url es");
            System.out.println(uploadPath);
            if (!uploadDir.exists()) uploadDir.mkdir();
            
            for (Part part : request.getParts()) {
                String fileName = request.getParameter("nombre");
                part.write(uploadPath + File.separator + fileName);
            }
            
            String evaluable=request.getParameter("ejEvaluable");
            String fechaEntrega = request.getParameter("fechaEntrega"); 
            //fecha obligatoria
             if(evaluable != null && (fechaEntrega == null || fechaEntrega.isEmpty())){
                 String errorFecha="Debes introducir una fecha de entrega";
                request.setAttribute("errorFecha", errorFecha);
                request.getRequestDispatcher("añadirEjercicio.jsp").forward(request,response);
                return;
             }
            
            //lista de alumnos
            ArrayList<Integer> alumnos = new ArrayList<>();
            try{
                String sql="Select id from usuario where rol='alumno'";
                st=con.createStatement();
                rs=st.executeQuery(sql);
                while(rs.next()){
                int idA= rs.getInt("id");
                alumnos.add(idA);
                
                }
            }catch(SQLException ex){
             ex.printStackTrace();   
            }
            //insertar el ejericico en la tabla de ejericio
            try{
                
                java.sql.Date fecha = null;
                int idEj=0;
                if(evaluable!= null && fechaEntrega != null && !fechaEntrega.isEmpty()){
                    fecha = java.sql.Date.valueOf(fechaEntrega);
                    String sql="insert into ejercicio (visibilidad, evaluable, fechaEntrega) values ('no', 1, ?)"; 
                    ps=con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                    ps.setDate(1, fecha);
                    ps.executeUpdate();
                   
                }else{
                    String sql="insert into ejercicio (visibilidad, evaluable) values ('no', 0)"; 
                    ps=con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                    ps.executeUpdate();
                }    
                
                //el id generado autoincrement
                    ResultSet rsId= ps.getGeneratedKeys();
                    if(rsId.next()){
                        idEj=rsId.getInt(1);
                    }
                    
                    //insertar el ejercicio en usuEjer
                    String sql2="insert into usuEjer(idUsu, idEj, completado) values (?,?,0)";
                    PreparedStatement ps2= con.prepareStatement(sql2);
                    for (int i=0; i<alumnos.size(); i++){
                        ps2.setInt(1,alumnos.get(i));
                        ps2.setInt(2, idEj);
                        ps2.executeUpdate();
                    }
                
            }catch(SQLException ex){
             ex.printStackTrace();   
            }
            
            response.sendRedirect("Gestionador?submit=EJERCICIOS");
            return;
        }
            
        int idUsu= (Integer) session.getAttribute("aId");
        try{
            String sql="Select rol from usuario where id=?";
            ps=con.prepareStatement(sql);
            ps.setInt(1,idUsu);
            rs=ps.executeQuery();
            while(rs.next()){
                String rolUsu= rs.getString("rol");
                if(rolUsu.equals("profesor")){
                    response.sendRedirect("profesor.jsp");
                }else{
                    try{
            ArrayList<ejercicio> listaVisible = new ArrayList<>();
            int usuId= (Integer) session.getAttribute("aId");
            
            String uql= "Select e.evaluable, e.id, ue.completado, e.fechaEntrega from ejercicio as e left join usuejer as ue on e.id=ue.idEj and ue.idUsu=? where visibilidad='yes' " ;
            ps=con.prepareStatement(uql);
            ps.setInt(1,usuId);
            rs=ps.executeQuery();
            while(rs.next()){
                boolean complet = rs.getBoolean("completado");
                boolean eval=rs.getBoolean("evaluable");
                int idE=rs.getInt("id");
                Date fecha=rs.getDate("fechaEntrega");
               listaVisible.add(new ejercicio(idE, complet, eval, fecha));
                
            }
            request.setAttribute("listaV", listaVisible);
            
            
            
            request.getRequestDispatcher("tablaEjercicio.jsp").forward(request,response);
            return;
        }catch(SQLException ex){
             ex.printStackTrace(); 

        
        }
                }
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
        System.out.println("post received");
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
