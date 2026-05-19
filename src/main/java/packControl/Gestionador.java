/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/JSP_Servlet/Servlet.java to edit this template
 */
package packControl;

import jakarta.servlet.ServletConfig;
import java.io.IOException;
import java.io.PrintWriter;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.Part;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import utils.BD;


/**
 *
 * @author quick
 */
@MultipartConfig(
    fileSizeThreshold = 1024 * 1024,
    maxFileSize = 1024 * 1024 * 10,
    maxRequestSize = 1024 * 1024 * 50
)
@WebServlet(name = "Gestionador", urlPatterns = {"/Gestionador"})
public class Gestionador extends HttpServlet {
private Connection con;
    private PreparedStatement ps;
    private Statement st;
    private ResultSet rs;
    
     public void init(ServletConfig cfg) throws ServletException{
         super.init(cfg);
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
        // 2. IMPORTAR ALUMNOS (CSV) - NUEVA LÓGICA
        if ("ALUMNOS LISTOS".equals(request.getParameter("btnSubmit"))) {
            Part filePart = request.getPart("archivoAlumnos");
            if (filePart != null) {
                try (InputStream is = filePart.getInputStream();
                     BufferedReader br = new BufferedReader(new InputStreamReader(is))) {
                    
                    String line;
                    String sqlInsert = "INSERT INTO usuario (nombre, apellidos, email, password, rol) VALUES (?, ?, ?, ?, 'alumno')";
                    String sqlGetEjer = "SELECT id FROM ejercicio";
                    String sqlAsigEjer = "INSERT INTO usuEjer (idUsu, idEj, completado) VALUES (?, ?, 0)";

                    while ((line = br.readLine()) != null) {
                        String[] datos = line.split(",");
                        if (datos.length >= 4) {
                            String nombre = datos[0].trim();
                            String apellidos = datos[1].trim();
                            String email = datos[2].trim();
                            String password = datos[3].trim();

                            // Insertar Alumno
                            ps = con.prepareStatement(sqlInsert, Statement.RETURN_GENERATED_KEYS);
                            ps.setString(1, nombre);
                            ps.setString(2, apellidos);
                            ps.setString(3, email);
                            ps.setString(4, password);
                            ps.executeUpdate();

                            // Obtener ID generado
                            ResultSet rsKeys = ps.getGeneratedKeys();
                            if (rsKeys.next()) {
                                int idNuevoUsu = rsKeys.getInt(1);

                                // Asignar todos los ejercicios existentes a este nuevo alumno
                                Statement stEjer = con.createStatement();
                                ResultSet rsEjer = stEjer.executeQuery(sqlGetEjer);
                                PreparedStatement psAsig = con.prepareStatement(sqlAsigEjer);
                                while (rsEjer.next()) {
                                    psAsig.setInt(1, idNuevoUsu);
                                    psAsig.setInt(2, rsEjer.getInt("id"));
                                    psAsig.executeUpdate();
                                }
                            }
                        }
                    }
                } catch (SQLException e) {
                    e.printStackTrace();
                }
            }
            response.sendRedirect("alumnos.jsp");
            return;
        }
        
        if("AÑADIR EJERCICIO".equals(request.getParameter("btnSubmit"))){
            
            response.sendRedirect("añadirEjercicio.jsp");
            return;
        }
        if("AÑADIR ALUMNOS".equals(request.getParameter("btnSubmit"))){
            
            response.sendRedirect("añadirAlumnos.jsp");
            return;
        }
        if("TABLA EJERCICIOS".equals(request.getParameter("btnsubmit"))){
            
            response.sendRedirect("Gestionador?submit=EJERCICIOS");
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
          /*   ArrayList<ejercicioProf> listaP = new ArrayList<>();
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
            return;*/
          // int idUsu = (Integer) session.getAttribute("aId");
          Integer idUsuObj = (Integer) session.getAttribute("aId");
            if (idUsuObj == null) {
                response.sendRedirect("index.jsp");
                return;
            }
            int idUsu = idUsuObj;
        
        try {
            // Primero consultamos el rol para saber qué tabla mostrar
            String sqlRol = "Select rol from usuario where id=?";
            ps = con.prepareStatement(sqlRol);
            ps.setInt(1, idUsu);
            rs = ps.executeQuery();
            
            if (rs.next()) {
                String rolUsu = rs.getString("rol");
                
                if ("profesor".equals(rolUsu)) {
                    // Lógica de Profesor (Ver todos)
                    ArrayList<ejercicioProf> listaP = new ArrayList<>();
                    String sqlP = "Select * from ejercicio";
                    st = con.createStatement();
                    ResultSet rsP = st.executeQuery(sqlP);
                    while (rsP.next()) {
                        listaP.add(new ejercicioProf(rsP.getInt("id"), rsP.getString("visibilidad"), rsP.getBoolean("evaluable")));
                    }
                    request.setAttribute("listaP", listaP);
                } else {
                    // Lógica de Alumno (Ver solo visibles y su estado)
                    ArrayList<ejercicio> listaVisible = new ArrayList<>();
                    String sqlA = "Select e.evaluable, e.id, ue.completado, e.fechaEntrega from ejercicio as e left join usuejer as ue on e.id=ue.idEj and ue.idUsu=? where visibilidad='yes'";
                    ps = con.prepareStatement(sqlA);
                    ps.setInt(1, idUsu);
                    ResultSet rsA = ps.executeQuery();
                    while (rsA.next()) {
                        listaVisible.add(new ejercicio(rsA.getInt("id"), rsA.getBoolean("completado"), rsA.getBoolean("evaluable"), rsA.getDate("fechaEntrega")));
                    }
                    request.setAttribute("listaV", listaVisible);
                }
                
                // Ambos usan la misma página pero con distintas listas de atributos
                request.getRequestDispatcher("tablaEjercicio.jsp").forward(request, response);
                return;
            }
        } catch (SQLException ex) {
            ex.printStackTrace();
        }
    
        }
        
        if("ELIMINAR EJERCICIO".equals(request.getParameter("submit"))){
            String idEj=request.getParameter("id");
            int idE= Integer.parseInt(idEj);
            try{
                String sql="delete from ejercicio where id=?";
                ps=con.prepareStatement(sql);
                ps.setInt(1, idE);
                ps.executeUpdate();
                // Al borrar, volvemos a la lista de ejercicios
                    response.sendRedirect("profesor.jsp?msg=eliminado");
                return;
                
            }catch(SQLException ex){
                ex.printStackTrace();
            }
            
        }
         
        if("confirmarFecha".equals(request.getParameter("accion"))){
                    String nuevaFecha = request.getParameter("nuevaFecha");
                    
                    String idEj=request.getParameter("id");
                    int idE= Integer.parseInt(idEj);

                    try {
                        Connection conn = BD.getConexion();
                        String sql = "UPDATE ejercicio SET fechaEntrega = ? WHERE id = ?";
                        ps = conn.prepareStatement(sql);
                        
                        if (nuevaFecha != null && !nuevaFecha.isEmpty()) {
                            ps.setDate(1, java.sql.Date.valueOf(nuevaFecha));
                        } else {
                            ps.setNull(1, java.sql.Types.DATE);
                        }
                        ps.setInt(2, idE);
                        ps.executeUpdate();
                    }catch(SQLException ex){
                        ex.printStackTrace();
                    }
        }
        
       if("EVALUABLES".equals(request.getParameter("btnSubmit"))){
            
            //int usuId= (Integer) session.getAttribute("aId");
            Integer usuIdObj = (Integer) session.getAttribute("aId");
            if (usuIdObj == null) {
                response.sendRedirect("index.jsp");
                return;
            }
            int usuId = usuIdObj;
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
          //  String uploadPath=getServletContext().getRealPath("") + File.separator+ "uploads";
          
            
            String evaluable=request.getParameter("ejEvaluable");
            String fechaEntrega = request.getParameter("fechaEntrega"); 
            
            
            //fecha obligatoria
             if(evaluable != null && (fechaEntrega == null || fechaEntrega.isEmpty())){
                 String errorFecha="Debes introducir una fecha de entrega";
                request.setAttribute("errorFecha", errorFecha);
                request.getRequestDispatcher("añadirEjercicio.jsp").forward(request,response);
                return;
                
             }
             if (evaluable != null && fechaEntrega != null && !fechaEntrega.isEmpty()) {

                java.sql.Date fechaEntr = java.sql.Date.valueOf(fechaEntrega);

                java.sql.Date hoy = new java.sql.Date(System.currentTimeMillis());

                 if(fechaEntr.before(hoy)){
                        String fechaPronto = "La fecha de entrega debe ser a partir de hoy";
                        request.setAttribute("fechaPronto", fechaPronto);
                        request.getRequestDispatcher("añadirEjercicio.jsp").forward(request,response);
                        return;
                    }
             }
             int idEj=0;
             try{
                 java.sql.Date fecha=null;
                 if(evaluable != null && fechaEntrega != null && !fechaEntrega.isEmpty()){
                     fecha = java.sql.Date.valueOf(fechaEntrega);
                     String sql = "insert into ejercicio (visibilidad, evaluable, fechaEntrega) values('no',1,?)";
                     ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                    ps.setDate(1, fecha);
                }else {
                    String sql = "insert into ejercicio (visibilidad, evaluable) values ('no', 0)";
                    ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                }
                
                ps.executeUpdate();

                //obtener el ID
                ResultSet rsId = ps.getGeneratedKeys();
                if(rsId.next()){
                    idEj = rsId.getInt(1);
                }

            } catch(SQLException ex){
                ex.printStackTrace();
            }
            
            //guarmas en json con el id
            String uploadPath = "C:\\uploads";
            File uploadDir = new File(uploadPath);
            if (!uploadDir.exists()) uploadDir.mkdirs();
            System.out.println("la url es");
            System.out.println(uploadPath);
            if (!uploadDir.exists()) uploadDir.mkdir();
           
            try {
                Part archivoPart = request.getPart("archivo");

                if (archivoPart != null && archivoPart.getSize() > 0) {
                    String rutaFinal = uploadPath + File.separator + idEj + ".json";
                    archivoPart.write(rutaFinal);

                    System.out.println("JSON guardado en: " + rutaFinal);
                    
                    String update="update ejercicio set ruta=? where id=?";
                    ps= con.prepareStatement(update);
                    ps.setString(1,rutaFinal);
                    ps.setInt(2, idEj);
                    ps.executeUpdate();
                    
                } else {
                    System.out.println("No se subió archivo");
                }

            } catch(Exception e){
                e.printStackTrace();
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
                /*
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
                    }*/
                    
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
        
        if("completar".equals(request.getParameter("accion"))){

            int idEj = Integer.parseInt(request.getParameter("id"));
            int idUsu = (Integer) session.getAttribute("aId");

            try{
                String sql = "UPDATE usuEjer SET completado=1 WHERE idUsu=? AND idEj=?";
                ps = con.prepareStatement(sql);
                ps.setInt(1, idUsu);
                ps.setInt(2, idEj);
                ps.executeUpdate();
            }catch(Exception e){
                e.printStackTrace();
            }

            return;
        }
        
        if("siguiente".equals(request.getParameter("accion"))){

            int idActual = Integer.parseInt(request.getParameter("id"));

            try{
                String sql = "SELECT id FROM ejercicio WHERE id > ? ORDER BY id ASC LIMIT 1";
                ps = con.prepareStatement(sql);
                ps.setInt(1, idActual);
                rs = ps.executeQuery();

                if(rs.next()){
                    int siguiente = rs.getInt("id");
                    response.sendRedirect("detalleEjercicio.jsp?id=" + siguiente);
                } else {
                    //response.sendRedirect("Gestionador?submit=EJERCICIOS");
                    System.out.println("NO HAY SIGUIENTE EJERCICIO");
                    response.sendRedirect("tablaEjercicio.jsp");
                    
                }
                  return;

            }catch(Exception e){
                e.printStackTrace();
            }

            return;
        }
        
        // === NUEVO BLOQUE: GUARDAR RESPUESTA JSON DE ALUMNOS ===
        if ("GUARDAR_RESPUESTA".equals(request.getParameter("submit"))) {
          //  Integer idUsuario = (Integer) session.getAttribute("aId");
        Integer idUsuObj = (Integer) session.getAttribute("aId");
        if (idUsuObj == null) {
            response.sendRedirect("index.jsp");
            return;
        }
        int idUsuario = idUsuObj;
            String idEjercicioStr = request.getParameter("id");
            String jsonGrafico = request.getParameter("jsonGrafico");

            if (/*idUsuario != null &&*/ idEjercicioStr != null && jsonGrafico != null) {
                int idEjercicio = Integer.parseInt(idEjercicioStr);
                PreparedStatement psGuardar = null;
                
                try {
                    // Actualizamos la respuesta JSON y marcamos como completado (completado = 1)
                    String sqlGuardar = "UPDATE usuejer SET completado = 1, respuesta = ? WHERE idUsu = ? AND idEj = ?";
                    psGuardar = con.prepareStatement(sqlGuardar);
                    psGuardar.setString(1, jsonGrafico);
                    psGuardar.setInt(2, idUsuario);
                    psGuardar.setInt(3, idEjercicio);
                    
                    psGuardar.executeUpdate();
                    
                    // Respondemos con éxito HTTP 200 al fetch de JavaScript
                    response.setStatus(HttpServletResponse.SC_OK);
                } catch (SQLException ex) {
                    ex.printStackTrace();
                    response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                } finally {
                    try { if (psGuardar != null) psGuardar.close(); } catch (SQLException e) {}
                }
            } else {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            }
            return; // Muy importante para cortar la ejecución aquí y que no intente redirigir
        }
        // =======================================================
        

        
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
