-- Cambiar contexto a master para crear la base y login
USE master;
GO

-- Eliminar base si existe
IF EXISTS (SELECT * FROM sys.databases WHERE name = 'VetCareDB')
BEGIN
    ALTER DATABASE VetCareDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE VetCareDB;
END
GO

-- Crear base de datos VetCareDB
CREATE DATABASE VetCareDB;
GO

-- Crear login si no existe
IF NOT EXISTS (SELECT * FROM sys.sql_logins WHERE name = 'usr_vetcare')
BEGIN
    CREATE LOGIN usr_vetcare WITH PASSWORD = 'TuPasswordAqui';
END
GO

-- Cambiar contexto a la nueva base
USE VetCareDB;
GO

-- Crear usuario en la base para el login
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'usr_vetcare')
BEGIN
    CREATE USER usr_vetcare FOR LOGIN usr_vetcare;
END
GO

-- Asignar rol db_owner al usuario para desarrollo
ALTER ROLE db_owner ADD MEMBER usr_vetcare;
GO

-- Crear tablas
CREATE TABLE Usuarios (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(50) NOT NULL -- Ej: admin, veterinario, cliente
);
GO

CREATE TABLE Mascotas (
    id INT IDENTITY(1,1) PRIMARY KEY,
    id_usuario INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    especie VARCHAR(50),
    raza VARCHAR(50),
    fecha_nacimiento DATE,
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id)
);
GO

CREATE TABLE Citas (
    id INT IDENTITY(1,1) PRIMARY KEY,
    id_mascota INT NOT NULL,
    id_veterinario INT NOT NULL,
    fecha DATETIME NOT NULL,
    motivo VARCHAR(255),
    estado VARCHAR(50) DEFAULT 'Pendiente',
    FOREIGN KEY (id_mascota) REFERENCES Mascotas(id),
    FOREIGN KEY (id_veterinario) REFERENCES Usuarios(id)
);
GO

CREATE TABLE Tratamientos (
    id INT IDENTITY(1,1) PRIMARY KEY,
    id_cita INT NOT NULL,
    descripcion VARCHAR(255),
    medicamentos VARCHAR(255),
    fecha DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_cita) REFERENCES Citas(id)
);
GO

CREATE TABLE ChatMensajes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    id_usuario INT NOT NULL,
    mensaje TEXT NOT NULL,
    fecha DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id)
);
GO

-- Insertar un veterinario y un cliente para pruebas
INSERT INTO Usuarios (email, password, nombre, rol) VALUES
('vet01', 'vetpass123', 'Dr. Juan Perez', 'veterinario'),
('cli01', 'clientpass123', 'Ana Gomez', 'cliente');
GO

-- Consultar para verificar
SELECT * FROM Citas;
GO

SELECT * FROM Usuarios;
GO

SELECT * FROM Citas;
GO

ALTER TABLE Citas ADD cliente_id INT;
ALTER TABLE Citas ADD CONSTRAINT FK_Citas_Cliente FOREIGN KEY (cliente_id) REFERENCES Usuarios(id);
