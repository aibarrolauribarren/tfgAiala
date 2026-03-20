/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package utils;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 *
 * @author quick
 */
public class BD {
    private static Connection conn;
    public static Connection getConexion(){
        String URL= "jdbc:mysql://localhost:3306/tfg";
        String USER="root";
        String PASSWORD="root";
        try{
            Class.forName("com.mysql.jdbc.Driver");
            conn=DriverManager.getConnection(URL,USER,PASSWORD);
            System.out.println("La BD conectada");
        }catch(ClassNotFoundException ex){
            System.out.println("No se encontro el Driver:" + ex);
        }catch(SQLException ex1){
            System.out.println("Error al conectar la BD: " + ex1);
        }
        return conn;
    }
}
