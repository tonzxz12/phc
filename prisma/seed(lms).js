import {  PrismaClient } from "@prisma/client";
import dotenv from 'dotenv'
dotenv.config();
const prisma = new PrismaClient();

const hash = process.env.DEFAULT_ADMIN_PASSWORD_HASH

async function bulkUpsert(model, data, uniqueField = "id") {
  const operations = data.map((item) =>
    model.upsert({
      where: { [uniqueField]: item[uniqueField] },
      update: { ...item },
      create: { ...item },
    })
  );
  await Promise.all(operations);
}

async function main() {
 
  const administrator =[
    {
      'id':'a92aee1390d24af8aa8aae920168b885',
      'email': 'admin@quanbyit.com',
      'firstname': 'Quanby IT',
      'lastname': 'Solutions',
      'role':'$2y$10$o65CIFnqKU6EOkOUEdBAYuZ.1MeXNIQ9ylyyli8YclzHFU996gROu',
      'password':hash,
      'lastseen': new Date(),
    }
  ]


  const students = [
  {
    id: "20e444e5796d43a09ee24b42e61301b7",
    firstname: "Romar",
    lastname: "Gallego",
    email: "test@quanbyit.com",
    password: hash,
    profile: "",
    address: "legazpi",
    nationality: "filipino",
    birthdate: "2002-02-23T00:00:00.000Z",
    gender: "Male",
    visibleid: "Q-S233-113154",
    timeenrolled: "2024-03-12T08:45:21.520Z",
    lastseen: "2024-07-05T00:26:45.000Z",
  },
  {
    id: "e496631bc5cb437c8563324c4de0e6d2",
    firstname: "Ma. Teodora Grace",
    lastname: "Payonga",
    email: "test1@quanbyit.com",
    password: hash,
    profile: "",
    address: "Morga St., Guinobatan, Albay",
    nationality: "Filipino",
    birthdate: "1989-02-07T00:00:00.000Z",
    gender: "Female",
    visibleid: "Q-S512-745280",
    timeenrolled: "2024-05-24T09:05:48.880Z",
    lastseen: "2024-05-24T09:23:43.000Z",
  },
];

const teachers = [
  {
    id: "b58f25d75ce64dc995627e5c238834c4",
    firstname: "Agnes",
    lastname: "Abunio",
    email: "teacher@quanbyit.com",
    password: hash,
    job: "Teacher",
    profile: "",
    esign: "",
    visibleid: "Q-T462-533310",
    lastseen: "2024-03-20T15:29:04.000Z",
  },
  {
    id: "012b7610d9a54d269181adafb9e5cf6d",
    firstname: "Gitt",
    lastname: "Beta",
    email: "teacher2@quanbyit.com",
    password: hash,
    job: "Teacher",
    profile: "",
    esign: "",
    visibleid: "Q-T504-416669",
    lastseen: "2024-10-04T21:47:42.000Z",
  },
  {
    id: "e4b173d6244c4664a84e0acfbc681d5d",
    firstname: "Gitt",
    lastname: "Teacher",
    email: "teacher3@quanbyit.com",
    password:hash ,
    job: "Teacher",
    profile: "",
    esign: "",
    visibleid: "Q-T916-025327",
    lastseen: "2025-02-19T13:00:46.000Z",
  },
];




  const admin_options =[
    {
      "type": "max_students",
      "value": "10000",
    },
    {
      "type": "local_server",
      "value": "'http://34.80.109.155",
    },
  ]

    const languages =[
    
      {
          "language": "English",
          "id": 2
      },
      {
          "language": "French",
          "id": 3
      },
      {
          "language": "Japanese",
          "id": 4
      }
  ] 


  await bulkUpsert(prisma.administrators, administrator);
  await bulkUpsert(prisma.students, students);
  await bulkUpsert(prisma.teachers, teachers);
  await bulkUpsert(prisma.admin_options, admin_options,"type");
    await bulkUpsert(prisma.languages, languages);


 
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



