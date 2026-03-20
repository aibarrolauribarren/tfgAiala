-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: tfg
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ejercicio`
--

DROP TABLE IF EXISTS `ejercicio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ejercicio` (
  `id` int NOT NULL AUTO_INCREMENT,
  `visibilidad` enum('yes','no') NOT NULL,
  `evaluable` tinyint(1) NOT NULL,
  `fechaEntrega` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ejercicio`
--

LOCK TABLES `ejercicio` WRITE;
/*!40000 ALTER TABLE `ejercicio` DISABLE KEYS */;
INSERT INTO `ejercicio` VALUES (1,'yes',0,NULL),(2,'yes',0,NULL),(3,'yes',0,NULL),(4,'yes',0,NULL),(5,'yes',1,'2026-03-06'),(6,'yes',0,NULL),(7,'yes',0,NULL),(8,'yes',0,NULL),(9,'yes',0,NULL),(10,'yes',1,'2026-04-13'),(11,'yes',0,NULL),(12,'yes',1,'2026-04-30'),(13,'no',0,NULL),(14,'no',1,'2026-05-02'),(15,'no',0,NULL),(16,'no',1,'2026-03-26');
/*!40000 ALTER TABLE `ejercicio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuario`
--

DROP TABLE IF EXISTS `usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario` (
  `id` int NOT NULL,
  `email` varchar(45) NOT NULL,
  `nombre` varchar(45) NOT NULL,
  `apellido` varchar(50) DEFAULT NULL,
  `contrasenia` varchar(45) NOT NULL,
  `rol` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario`
--

LOCK TABLES `usuario` WRITE;
/*!40000 ALTER TABLE `usuario` DISABLE KEYS */;
INSERT INTO `usuario` VALUES (1,'carmen@gmail.com','Carmen','Uribarren','contra','alumno'),(2,'mikel@gmail.com','Mikel','Perez','contra','alumno'),(3,'ane@gmail.com','Ane','Larrea','contra','alumno'),(4,'unai@gmail.com','Unai','Alday','contra','alumno'),(5,'josu@gmail.com','Josu','Aldama','contra','alumno'),(6,'leire@gmail.com','Leire','Llano','contra','alumno'),(7,'irene@gmail.com','Irene','Ibarrola','contra','alumno'),(8,'lucia@gmail.com','Lucia','Alonso','contra','alumno'),(9,'julen@gmail.com','Julen','Egia','contra','alumno'),(10,'ainhoa@gmail.com','Ainhoa','Pinedo','contra','profesor');
/*!40000 ALTER TABLE `usuario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuejer`
--

DROP TABLE IF EXISTS `usuejer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuejer` (
  `idUsu` int NOT NULL,
  `idEj` int NOT NULL,
  `completado` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`idUsu`,`idEj`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuejer`
--

LOCK TABLES `usuejer` WRITE;
/*!40000 ALTER TABLE `usuejer` DISABLE KEYS */;
INSERT INTO `usuejer` VALUES (1,1,1),(1,2,0),(1,3,0),(1,4,0),(1,5,0),(1,6,0),(1,7,1),(1,8,0),(1,9,1),(1,10,0),(1,11,0),(1,12,0),(1,13,0),(1,14,0),(1,15,0),(1,16,0),(2,1,0),(2,2,0),(2,3,0),(2,4,0),(2,5,1),(2,6,0),(2,7,0),(2,8,0),(2,9,0),(2,10,1),(2,11,0),(2,12,0),(2,13,0),(2,14,0),(2,15,0),(2,16,0),(3,1,0),(3,2,0),(3,3,0),(3,4,0),(3,5,0),(3,6,0),(3,7,0),(3,8,0),(3,9,0),(3,10,0),(3,11,0),(3,12,0),(3,13,0),(3,14,0),(3,15,0),(3,16,0),(4,1,0),(4,2,0),(4,3,0),(4,4,0),(4,5,0),(4,6,0),(4,7,0),(4,8,0),(4,9,0),(4,10,0),(4,11,0),(4,12,0),(4,13,0),(4,14,0),(4,15,0),(4,16,0),(5,1,0),(5,2,0),(5,3,0),(5,4,0),(5,5,1),(5,6,0),(5,7,0),(5,8,0),(5,9,0),(5,10,1),(5,11,0),(5,12,0),(5,13,0),(5,14,0),(5,15,0),(5,16,0),(6,1,0),(6,2,0),(6,3,1),(6,4,0),(6,5,1),(6,6,0),(6,7,1),(6,8,0),(6,9,0),(6,10,1),(6,11,0),(6,12,0),(6,13,0),(6,14,0),(6,15,0),(6,16,0),(7,1,0),(7,2,0),(7,3,0),(7,4,0),(7,5,1),(7,6,0),(7,7,0),(7,8,0),(7,9,0),(7,10,0),(7,11,0),(7,12,0),(7,13,0),(7,14,0),(7,15,0),(7,16,0),(8,1,0),(8,2,0),(8,3,0),(8,4,0),(8,5,0),(8,6,0),(8,7,0),(8,8,0),(8,9,0),(8,10,1),(8,11,0),(8,12,0),(8,13,0),(8,14,0),(8,15,0),(8,16,0),(9,1,0),(9,2,0),(9,3,0),(9,4,0),(9,5,1),(9,6,0),(9,7,0),(9,8,0),(9,9,0),(9,10,0),(9,11,0),(9,12,0),(9,13,0),(9,14,0),(9,15,0),(9,16,0);
/*!40000 ALTER TABLE `usuejer` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-20 10:12:45
