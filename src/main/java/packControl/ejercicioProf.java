/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package packControl;

/**
 *
 * @author quick
 */
public class ejercicioProf {
    private String visibilidad;
    private int id;
    private boolean eval;
    
    public ejercicioProf( int id, String visibilidad, boolean eval){
        this.visibilidad=visibilidad;
        this.id= id;
        this.eval=eval;
    }
        
    public String isVisible(){
        return visibilidad;
    }
    
    public int getId(){
        return id;
    }
    
    public boolean isEval(){
        return eval;
    }
}


