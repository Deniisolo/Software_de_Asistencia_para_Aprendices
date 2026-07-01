const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

async function main() {
  await prisma.rol.upsert({
    where: { idRol: 1 },
    update: {},
    create: {
      idRol: 1,
      nombreRol: "Aprendiz"
    }
  });

  await prisma.rol.upsert({
    where: { idRol: 2 },
    update: {},
    create: {
      idRol: 2,
      nombreRol: "Instructor"
    }
  });

  await prisma.rol.upsert({
    where: { idRol: 3 },
    update: {},
    create: {
      idRol: 3,
      nombreRol: "Administrador"
    }
  });

  await prisma.tipoDocumento.upsert({
    where: { idTipoDocumento: 1 },
    update: {},
    create: {
      idTipoDocumento: 1,
      nombreDocumento: "Cedula",
      tipoDocumentoCol: "CC"
    }
  });

  const users = [
    {
      idUsuario: 1001,
      nombre: "Ana",
      apellido: "Gomez",
      correoElectronico: "ana.gomez@example.com",
      telefono: "3000001001",
      numeroDocumento: "1001001",
      idTipoDocumento: "CC",
      idGenero: "F",
      usemame: "agomez",
      contrasenia: "hashed_demo_1",
      qrCode: "QR-ANA-1001",
      rolIdRol: 1,
      tipoDocumentoIdTipoDocumento: 1
    },
    {
      idUsuario: 1002,
      nombre: "Luis",
      apellido: "Martinez",
      correoElectronico: "luis.martinez@example.com",
      telefono: "3000001002",
      numeroDocumento: "1001002",
      idTipoDocumento: "CC",
      idGenero: "M",
      usemame: "lmartinez",
      contrasenia: "hashed_demo_2",
      qrCode: "QR-LUIS-1002",
      rolIdRol: 1,
      tipoDocumentoIdTipoDocumento: 1
    },
    {
      idUsuario: 2001,
      nombre: "Carlos",
      apellido: "Perez",
      correoElectronico: "carlos.perez@example.com",
      telefono: "3000002001",
      numeroDocumento: "2002001",
      idTipoDocumento: "CC",
      idGenero: "M",
      usemame: "cperez",
      contrasenia: "  ",
      qrCode: "QR-CARLOS-2001",
      rolIdRol: 2,
      tipoDocumentoIdTipoDocumento: 1
    },
    {
      idUsuario: 3001,
      nombre: "Sara",
      apellido: "Admin",
      correoElectronico: "sara.admin@example.com",
      telefono: "3000003001",
      numeroDocumento: "3003001",
      idTipoDocumento: "CC",
      idGenero: "F",
      usemame: "sadmin",
      contrasenia: "hashed_demo_4",
      qrCode: "QR-SARA-3001",
      rolIdRol: 3,
      tipoDocumentoIdTipoDocumento: 1
    }
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.contrasenia, BCRYPT_ROUNDS);

    await prisma.usuario.upsert({
      where: {
        idUsuario_rolIdRol: {
          idUsuario: user.idUsuario,
          rolIdRol: user.rolIdRol
        }
      },
      update: {
        nombre: user.nombre,
        apellido: user.apellido,
        correoElectronico: user.correoElectronico,
        telefono: user.telefono,
        numeroDocumento: user.numeroDocumento,
        usemame: user.usemame,
        contrasenia: hashedPassword,
        qrCode: user.qrCode
      },
      create: {
        ...user,
        contrasenia: hashedPassword
      }
    });
  }

  await prisma.centroDeFormacion.upsert({
    where: { idCentroDeFormacion: 1 },
    update: {},
    create: {
      idCentroDeFormacion: 1,
      ciudad: "Bogota",
      dirreccion: "Calle demo 123"
    }
  });

  await prisma.ambiente.upsert({
    where: { idAmbiente: 1 },
    update: {},
    create: {
      idAmbiente: 1,
      nombreAmbiente: "Sala de sistemas 1",
      ubicacion: "Bloque A",
      centroDeFormacionIdCentroDeFormacion: 1
    }
  });

  const cursos = [
    {
      idCurso: 1,
      nombreCurso: "Desarrollo de software",
      nivelFormacion: "Tecnologo",
      duracion: "120 horas",
      idUsuario: "2001"
    },
    {
      idCurso: 2,
      nombreCurso: "Registro contable",
      nivelFormacion: "Tecnico",
      duracion: "80 horas",
      idUsuario: "2001"
    }
  ];

  for (const curso of cursos) {
    await prisma.cursoCompetencia.upsert({
      where: { idCurso: curso.idCurso },
      update: curso,
      create: curso
    });
  }

  const programas = [
    {
      idProgramaFormacion: 1,
      nombrePrograma: "Tecnologo en ADSO",
      nivelFormacion: "Tecnologo"
    },
    {
      idProgramaFormacion: 2,
      nombrePrograma: "Tecnico en Contabilidad",
      nivelFormacion: "Tecnico"
    }
  ];

  for (const programa of programas) {
    await prisma.programaFormacion.upsert({
      where: { idProgramaFormacion: programa.idProgramaFormacion },
      update: programa,
      create: programa
    });
  }

  await prisma.programaFormacionHasCursoCompetencia.upsert({
    where: { cursoCompetenciaIdCurso: 1 },
    update: { programaFormacionIdProgramaFormacion: 1 },
    create: {
      cursoCompetenciaIdCurso: 1,
      programaFormacionIdProgramaFormacion: 1
    }
  });

  await prisma.programaFormacionHasCursoCompetencia.upsert({
    where: { cursoCompetenciaIdCurso: 2 },
    update: { programaFormacionIdProgramaFormacion: 2 },
    create: {
      cursoCompetenciaIdCurso: 2,
      programaFormacionIdProgramaFormacion: 2
    }
  });

  const fichas = [
    {
      idFicha: 287001,
      numeroFicha: "287001",
      idProgramaFormacion: "1"
    },
    {
      idFicha: 287002,
      numeroFicha: "287002",
      idProgramaFormacion: "2"
    }
  ];

  for (const ficha of fichas) {
    await prisma.ficha.upsert({
      where: { idFicha: ficha.idFicha },
      update: ficha,
      create: ficha
    });
  }

  await prisma.trimestre.upsert({
    where: { idTrimestre: 1 },
    update: {},
    create: {
      idTrimestre: 1,
      nombre: "Trimestre 1 - 2025",
      fechaInicio: "2025-04-01",
      fechaFin: "2025-04-30"
    }
  });

  const clases = [
    {
      idClase: 1,
      nombreTema: "Introduccion a programacion",
      fecha: "2025-04-01",
      horaInicio: "07:00",
      ambienteIdAmbiente: 1,
      cursoCompetenciaIdCurso: 1,
      fichaIdFicha: 287001,
      trimestreIdTrimestre: 1
    },
    {
      idClase: 2,
      nombreTema: "Estructuras de control",
      fecha: "2025-04-03",
      horaInicio: "13:00",
      ambienteIdAmbiente: 1,
      cursoCompetenciaIdCurso: 1,
      fichaIdFicha: 287001,
      trimestreIdTrimestre: 1
    },
    {
      idClase: 3,
      nombreTema: "Modelado de datos",
      fecha: "2025-04-02",
      horaInicio: "08:00",
      ambienteIdAmbiente: 1,
      cursoCompetenciaIdCurso: 2,
      fichaIdFicha: 287002,
      trimestreIdTrimestre: 1
    }
  ];

  for (const clase of clases) {
    await prisma.clase.upsert({
      where: { idClase: clase.idClase },
      update: clase,
      create: clase
    });
  }

  const asistencias = [
    {
      idAsistencia: 5001,
      fecha: "2025-04-01",
      horaIngreso: "07:05",
      horaFin: "09:00",
      estadoPresenteTardeAusente: "presente",
      idAprendiz: "1001",
      claseIdClase: 1
    },
    {
      idAsistencia: 5002,
      fecha: "2025-04-03",
      horaIngreso: "13:20",
      horaFin: "15:00",
      estadoPresenteTardeAusente: "tarde",
      idAprendiz: "1001",
      claseIdClase: 2
    },
    {
      idAsistencia: 5003,
      fecha: "2025-04-02",
      horaIngreso: "08:00",
      horaFin: "10:00",
      estadoPresenteTardeAusente: "presente",
      idAprendiz: "1002",
      claseIdClase: 3
    }
  ];

  for (const registro of asistencias) {
    await prisma.asistencia.upsert({
      where: { idAsistencia: registro.idAsistencia },
      update: registro,
      create: registro
    });
  }

  const aprendices = [
    { fichaIdFicha: 287001, usuarioIdUsuario: 1001, estado: "activo" },
    { fichaIdFicha: 287002, usuarioIdUsuario: 1002, estado: "activo" }
  ];

  for (const aprendiz of aprendices) {
    await prisma.aprendiz.upsert({
      where: {
        fichaIdFicha_usuarioIdUsuario: {
          fichaIdFicha: aprendiz.fichaIdFicha,
          usuarioIdUsuario: aprendiz.usuarioIdUsuario
        }
      },
      update: aprendiz,
      create: aprendiz
    });
  }

  await prisma.instructor.upsert({
    where: { usuarioIdUsuario: 2001 },
    update: { usuarioIdUsuario: 2001 },
    create: { usuarioIdUsuario: 2001 }
  });

  await prisma.instructorFicha.upsert({
    where: {
      fichaIdFicha_usuarioIdUsuario: { fichaIdFicha: 287001, usuarioIdUsuario: 2001 }
    },
    update: {},
    create: { fichaIdFicha: 287001, usuarioIdUsuario: 2001 }
  });

  console.log("Seed ejecutado: usuarios ficticios insertados.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
