USE VetCareDB;
GO

-- Drop existing tables if they exist
IF OBJECT_ID('dbo.ChatMensajes', 'U') IS NOT NULL
    DROP TABLE dbo.ChatMensajes;
IF OBJECT_ID('dbo.ChatSesiones', 'U') IS NOT NULL
    DROP TABLE dbo.ChatSesiones;
GO

-- Create ChatSesiones table with consistent naming
CREATE TABLE dbo.ChatSesiones (
    id INT IDENTITY(1,1) PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_veterinario INT NOT NULL,
    fecha_ultimo_mensaje DATETIME DEFAULT GETDATE(),
    estado VARCHAR(20) DEFAULT 'activo',
    FOREIGN KEY (id_cliente) REFERENCES Usuarios(id),
    FOREIGN KEY (id_veterinario) REFERENCES Usuarios(id)
);
GO

-- Create ChatMensajes table with consistent naming
CREATE TABLE dbo.ChatMensajes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    id_sesion INT NOT NULL,
    id_emisor INT NOT NULL,
    mensaje TEXT NOT NULL,
    fecha DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_sesion) REFERENCES ChatSesiones(id),
    FOREIGN KEY (id_emisor) REFERENCES Usuarios(id)
);
GO

select * from ChatMensajes
select * from ChatSesiones