import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';

config();

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 [Seed] Avvio popolamento database idempotente HaruKaizen...');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. ACCOUNT BASE (Admin, Coach, User) — Rigorosamente con upsert
  // ─────────────────────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('AdminSecurePass2026!', 10);
  const coachPassword = await bcrypt.hash('CoachKaizen2026!', 10);
  const userPassword  = await bcrypt.hash('UserKaizen2026!', 10);

  // Admin
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@harukaizen.local' },
    update: {
      role: 'ADMIN',
      passwordHash: adminPassword,
    },
    create: {
      email:        'admin@harukaizen.local',
      passwordHash: adminPassword,
      authProvider: 'LOCAL',
      role:         'ADMIN',
      heightCm:     180,
      birthDate:    new Date('1988-03-25'),
      sex:          'M',
      lifestyleMultiplier: 1.55,
      userSettings: {
        create: {
          timezone:       'Europe/Rome',
          locale:         'it-IT',
          targetWeightKg: 82,
          coachTone:      'RIGOROUS',
          isDarkMode:     true,
        },
      },
    },
  });

  // Coach
  const coach = await prisma.user.upsert({
    where:  { email: 'coach@harukaizen.local' },
    update: {
      role: 'USER',
      passwordHash: coachPassword,
    },
    create: {
      email:        'coach@harukaizen.local',
      passwordHash: coachPassword,
      authProvider: 'LOCAL',
      role:         'USER',
      heightCm:     182,
      birthDate:    new Date('1992-07-10'),
      sex:          'M',
      lifestyleMultiplier: 1.725,
      userSettings: {
        create: {
          timezone:       'Europe/Rome',
          locale:         'it-IT',
          targetWeightKg: 85,
          coachTone:      'KAIZEN',
          isDarkMode:     true,
        },
      },
    },
  });

  // User Standard
  const user = await prisma.user.upsert({
    where:  { email: 'user@harukaizen.local' },
    update: {
      role: 'USER',
      passwordHash: userPassword,
    },
    create: {
      email:        'user@harukaizen.local',
      passwordHash: userPassword,
      authProvider: 'LOCAL',
      role:         'USER',
      heightCm:     178,
      birthDate:    new Date('1996-11-14'),
      sex:          'M',
      lifestyleMultiplier: 1.375,
      userSettings: {
        create: {
          timezone:       'Europe/Rome',
          locale:         'it-IT',
          targetWeightKg: 75,
          coachTone:      'EMPATHETIC',
          isDarkMode:     true,
        },
      },
    },
  });

  console.log(`✅ [Seed] Account verificati: Admin (${admin.email}), Coach (${coach.email}), User (${user.email})`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. CATALOGO ESERCIZI (50+ Esercizi essenziali suddivisi per biomeccanica)
  // ─────────────────────────────────────────────────────────────────────────────
  const exercises = [
    // --- CHEST (Pettorali) ---
    { name: 'Panca Piana con Bilanciere',       category: 'CHEST', equipment: 'BARBELL',    defaultMetValue: 6.0 },
    { name: 'Panca Inclinata con Manubri',      category: 'CHEST', equipment: 'DUMBBELL',   defaultMetValue: 5.5 },
    { name: 'Panca Declinata con Bilanciere',   category: 'CHEST', equipment: 'BARBELL',    defaultMetValue: 5.5 },
    { name: 'Spinte con Manubri su Piana',      category: 'CHEST', equipment: 'DUMBBELL',   defaultMetValue: 5.5 },
    { name: 'Croci ai Cavi ad Altezza Spalle',  category: 'CHEST', equipment: 'CABLE',      defaultMetValue: 4.5 },
    { name: 'Croci con Manubri su Panca',       category: 'CHEST', equipment: 'DUMBBELL',   defaultMetValue: 4.5 },
    { name: 'Dip alle Parallele (Chest Dip)',   category: 'CHEST', equipment: 'BODYWEIGHT', defaultMetValue: 6.5 },
    { name: 'Piegamenti sulle Braccia',         category: 'CHEST', equipment: 'BODYWEIGHT', defaultMetValue: 4.8 },
    { name: 'Chest Press a Leva Verticale',     category: 'CHEST', equipment: 'MACHINE',    defaultMetValue: 5.0 },

    // --- BACK (Dorsali & Catena Posteriore) ---
    { name: 'Stacco da Terra Tradizionale',     category: 'BACK', equipment: 'BARBELL',    defaultMetValue: 7.5 },
    { name: 'Trazioni alla Sbarra (Pull-ups)',  category: 'BACK', equipment: 'BODYWEIGHT', defaultMetValue: 6.5 },
    { name: 'Trazioni Presa Supina (Chin-ups)', category: 'BACK', equipment: 'BODYWEIGHT', defaultMetValue: 6.0 },
    { name: 'Rematore con Bilanciere a 45°',    category: 'BACK', equipment: 'BARBELL',    defaultMetValue: 6.0 },
    { name: 'Rematore con Manubrio Singolo',    category: 'BACK', equipment: 'DUMBBELL',   defaultMetValue: 5.5 },
    { name: 'Lat Machine al Petto Presa Larga', category: 'BACK', equipment: 'CABLE',      defaultMetValue: 5.0 },
    { name: 'Pulley Basso al Cavo',             category: 'BACK', equipment: 'CABLE',      defaultMetValue: 5.0 },
    { name: 'T-Bar Row con Supporto Petto',     category: 'BACK', equipment: 'MACHINE',    defaultMetValue: 5.5 },
    { name: 'Face Pull con Corda al Cavo',      category: 'BACK', equipment: 'CABLE',      defaultMetValue: 4.0 },
    { name: 'Estensioni Lombari (Hyperextension)', category: 'BACK', equipment: 'BODYWEIGHT', defaultMetValue: 4.0 },

    // --- LEGS (Quadricipiti, Femorali, Glutei, Polpacci) ---
    { name: 'Squat Posteriore con Bilanciere',  category: 'LEGS', equipment: 'BARBELL',    defaultMetValue: 7.0 },
    { name: 'Front Squat con Bilanciere',       category: 'LEGS', equipment: 'BARBELL',    defaultMetValue: 7.0 },
    { name: 'Leg Press a 45°',                  category: 'LEGS', equipment: 'MACHINE',    defaultMetValue: 6.0 },
    { name: 'Affondi Camminati con Manubri',    category: 'LEGS', equipment: 'DUMBBELL',   defaultMetValue: 6.0 },
    { name: 'Stacco Rumeno con Bilanciere',     category: 'LEGS', equipment: 'BARBELL',    defaultMetValue: 6.0 },
    { name: 'Squat Bulgaro con Manubri',        category: 'LEGS', equipment: 'DUMBBELL',   defaultMetValue: 6.0 },
    { name: 'Hip Thrust con Bilanciere',        category: 'LEGS', equipment: 'BARBELL',    defaultMetValue: 6.0 },
    { name: 'Leg Curl Sdraiato (Femorali)',     category: 'LEGS', equipment: 'MACHINE',    defaultMetValue: 4.5 },
    { name: 'Leg Extension (Quadricipiti)',     category: 'LEGS', equipment: 'MACHINE',    defaultMetValue: 4.5 },
    { name: 'Calf Raise in Piedi alla Macchina', category: 'LEGS', equipment: 'MACHINE',   defaultMetValue: 4.0 },
    { name: 'Hack Squat Machine',               category: 'LEGS', equipment: 'MACHINE',    defaultMetValue: 6.5 },

    // --- SHOULDERS (Deltoidi & Trapezio) ---
    { name: 'Military Press con Bilanciere',    category: 'SHOULDERS', equipment: 'BARBELL',    defaultMetValue: 6.0 },
    { name: 'Lento Avanti con Manubri da Seduti', category: 'SHOULDERS', equipment: 'DUMBBELL', defaultMetValue: 5.5 },
    { name: 'Alzate Laterali con Manubri',      category: 'SHOULDERS', equipment: 'DUMBBELL',   defaultMetValue: 4.0 },
    { name: 'Alzate Laterali al Cavo Singolo',  category: 'SHOULDERS', equipment: 'CABLE',      defaultMetValue: 4.0 },
    { name: 'Alzate Posteriori a 90° (Deltoidi Post)', category: 'SHOULDERS', equipment: 'DUMBBELL', defaultMetValue: 4.0 },
    { name: 'Tirate al Mento con Bilanciere',   category: 'SHOULDERS', equipment: 'BARBELL',    defaultMetValue: 5.0 },
    { name: 'Arnold Press con Manubri',         category: 'SHOULDERS', equipment: 'DUMBBELL',   defaultMetValue: 5.5 },
    { name: 'Shoulder Press Isolatela Macchina', category: 'SHOULDERS', equipment: 'MACHINE',   defaultMetValue: 5.0 },

    // --- ARMS (Bicipiti & Tricipiti) ---
    { name: 'Curl con Bilanciere Sagomato EZ',  category: 'ARMS', equipment: 'BARBELL',    defaultMetValue: 4.5 },
    { name: 'Curl Alternato con Manubri in Piedi', category: 'ARMS', equipment: 'DUMBBELL', defaultMetValue: 4.5 },
    { name: 'Hammer Curl con Manubri',          category: 'ARMS', equipment: 'DUMBBELL',   defaultMetValue: 4.5 },
    { name: 'Curl su Panca Scott',              category: 'ARMS', equipment: 'MACHINE',    defaultMetValue: 4.5 },
    { name: 'Curl ai Cavi con Barra Dritta',    category: 'ARMS', equipment: 'CABLE',      defaultMetValue: 4.5 },
    { name: 'Pushdown Tricipiti con Corda ai Cavi', category: 'ARMS', equipment: 'CABLE',   defaultMetValue: 4.5 },
    { name: 'French Press su Panca con Bilanciere EZ', category: 'ARMS', equipment: 'BARBELL', defaultMetValue: 5.0 },
    { name: 'Dip tra Panche per Tricipiti',     category: 'ARMS', equipment: 'BODYWEIGHT', defaultMetValue: 4.8 },
    { name: 'Estensioni Tricipiti con Manubrio dietro la Nuca', category: 'ARMS', equipment: 'DUMBBELL', defaultMetValue: 4.5 },
    { name: 'Kickback per Tricipiti al Cavo',   category: 'ARMS', equipment: 'CABLE',      defaultMetValue: 4.0 },

    // --- CORE (Addominali & Stabilità) ---
    { name: 'Crunch a Terra a Gambe Flesse',    category: 'CORE', equipment: 'BODYWEIGHT', defaultMetValue: 3.8 },
    { name: 'Plank Isometrico su Gomiti',       category: 'CORE', equipment: 'BODYWEIGHT', defaultMetValue: 4.0 },
    { name: 'Hanging Leg Raise alla Sbarra',    category: 'CORE', equipment: 'BODYWEIGHT', defaultMetValue: 5.0 },
    { name: 'Russian Twist a Corpo Libero',     category: 'CORE', equipment: 'BODYWEIGHT', defaultMetValue: 4.0 },
    { name: 'Ab Wheel Rollout con Ruota',       category: 'CORE', equipment: 'BODYWEIGHT', defaultMetValue: 5.0 },
    { name: 'Woodchopper ai Cavi Diagonale',    category: 'CORE', equipment: 'CABLE',      defaultMetValue: 4.5 },

    // --- CARDIO & RESISTENZA ---
    { name: 'Corsa su Tapis Roulant',           category: 'CARDIO', equipment: 'MACHINE',    defaultMetValue: 9.5 },
    { name: 'Vogatore Indoor (Rowing)',         category: 'CARDIO', equipment: 'MACHINE',    defaultMetValue: 8.0 },
    { name: 'Cyclette Stazionaria ad Intervalli', category: 'CARDIO', equipment: 'MACHINE',  defaultMetValue: 7.5 },
    { name: 'Salto della Corda Continuo',       category: 'CARDIO', equipment: 'BODYWEIGHT', defaultMetValue: 10.0 },
  ];

  let exerciseCount = 0;
  for (const ex of exercises) {
    const id = `seed-${ex.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    await prisma.exercise.upsert({
      where: { id },
      update: {
        name:            ex.name,
        category:        ex.category,
        equipment:       ex.equipment,
        defaultMetValue: ex.defaultMetValue,
        isVerified:      true,
      },
      create: {
        id,
        name:            ex.name,
        category:        ex.category,
        equipment:       ex.equipment,
        defaultMetValue: ex.defaultMetValue,
        isVerified:      true,
      },
    });
    exerciseCount++;
  }
  console.log(`✅ [Seed] Esercizi inseriti/aggiornati: ${exerciseCount}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CIBI CERTIFICATI DI BASE (Verificati per 100g con Barcode univoci)
  // ─────────────────────────────────────────────────────────────────────────────
  const certifiedFoods = [
    {
      barcode:      '8001234000010',
      name:         'Fiocchi di Avena Integrale',
      calories100g: 370,
      protein100g:  13.5,
      carbs100g:    59.0,
      fat100g:      7.0,
      fiber100g:    10.0,
      sodium100g:   5.0,
    },
    {
      barcode:      '8001234000027',
      name:         'Petto di Pollo Fresco',
      calories100g: 110,
      protein100g:  23.5,
      carbs100g:    0.0,
      fat100g:      1.2,
      fiber100g:    0.0,
      sodium100g:   65.0,
    },
    {
      barcode:      '8001234000034',
      name:         'Riso Basmati Bianco',
      calories100g: 350,
      protein100g:  8.5,
      carbs100g:    78.0,
      fat100g:      0.8,
      fiber100g:    1.5,
      sodium100g:   2.0,
    },
    {
      barcode:      '8001234000041',
      name:         'Uovo Intero di Gallina',
      calories100g: 143,
      protein100g:  12.6,
      carbs100g:    0.7,
      fat100g:      9.9,
      fiber100g:    0.0,
      sodium100g:   142.0,
    },
    {
      barcode:      '8001234000058',
      name:         'Olio Extra Vergine di Oliva',
      calories100g: 884,
      protein100g:  0.0,
      carbs100g:    0.0,
      fat100g:      100.0,
      fiber100g:    0.0,
      sodium100g:   0.0,
    },
    {
      barcode:      '8001234000065',
      name:         'Whey Protein Isolate (Proteine del Siero)',
      calories100g: 380,
      protein100g:  85.0,
      carbs100g:    2.5,
      fat100g:      1.5,
      fiber100g:    0.5,
      sodium100g:   120.0,
    },
    {
      barcode:      '8001234000072',
      name:         'Tonno al Naturale Sgocciolato',
      calories100g: 105,
      protein100g:  25.0,
      carbs100g:    0.0,
      fat100g:      0.6,
      fiber100g:    0.0,
      sodium100g:   350.0,
    },
    {
      barcode:      '8001234000089',
      name:         'Salmone Fresco Selvaggio',
      calories100g: 206,
      protein100g:  22.0,
      carbs100g:    0.0,
      fat100g:      13.0,
      fiber100g:    0.0,
      sodium100g:   55.0,
    },
    {
      barcode:      '8001234000096',
      name:         'Mandorle Sgusciate Naturali',
      calories100g: 579,
      protein100g:  21.2,
      carbs100g:    9.1,
      fat100g:      49.9,
      fiber100g:    12.5,
      sodium100g:   1.0,
    },
    {
      barcode:      '8001234000102',
      name:         'Yogurt Greco 0% Grassi',
      calories100g: 57,
      protein100g:  10.3,
      carbs100g:    4.0,
      fat100g:      0.2,
      fiber100g:    0.0,
      sodium100g:   40.0,
    },
  ];

  let foodCount = 0;
  for (const food of certifiedFoods) {
    await prisma.foodItem.upsert({
      where: { barcode: food.barcode },
      update: {
        name:         food.name,
        calories100g: food.calories100g,
        protein100g:  food.protein100g,
        carbs100g:    food.carbs100g,
        fat100g:      food.fat100g,
        fiber100g:    food.fiber100g,
        sodium100g:   food.sodium100g,
        isVerified:   true,
      },
      create: {
        barcode:      food.barcode,
        name:         food.name,
        calories100g: food.calories100g,
        protein100g:  food.protein100g,
        carbs100g:    food.carbs100g,
        fat100g:      food.fat100g,
        fiber100g:    food.fiber100g,
        sodium100g:   food.sodium100g,
        isVerified:   true,
      },
    });
    foodCount++;
  }
  console.log(`✅ [Seed] Cibi certificati inseriti/aggiornati: ${foodCount}`);

  console.log('\n🌸 [Seed] Mega-Sprint 13 Data Seeding completato con successo!');
}

main()
  .catch((e) => {
    console.error('❌ [Seed] Errore durante il seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

