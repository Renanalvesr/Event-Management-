/**
 * seed-firestore.mjs
 *
 * Popula o Firestore com os dados mock iniciais (organizações + eventos).
 * Execute UMA VEZ após configurar o projeto:
 *
 *   node seed-firestore.mjs
 *
 * Obs: usuários são criados pelo fluxo normal de cadastro (Firebase Auth + Firestore).
 * Para o superadmin de plataforma, cadastre manualmente com o email superadmin@capoeira.com
 * e crie o documento em Firestore com role: 'SUPER_ADMIN', organizationId: null.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, setDoc, doc, collection } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBpKz4mwh5AvaLeLofOHQhkVYUlscDVrDc',
  authDomain: 'events-capoeira.firebaseapp.com',
  databaseURL: 'https://events-capoeira-default-rtdb.firebaseio.com',
  projectId: 'events-capoeira',
  storageBucket: 'events-capoeira.firebasestorage.app',
  messagingSenderId: '473189260844',
  appId: '1:473189260844:web:11c38e1936e5a650a23b89'
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ─── Organizations ────────────────────────────────────────────────────────────
const organizations = [
  {
    id: 1, parentOrganizationId: null,
    name: 'Associação de Capoeira Nosso Senhor do Bonfim', slug: 'acnsb',
    description: 'Grupo dedicado à preservação e disseminação da capoeira como patrimônio cultural imaterial.',
    city: 'Campinas', state: 'SP', country: 'Brasil',
    address: 'Rua das Artes, 123 - Centro',
    contactPhone: '+5511973333333', contactEmail: 'contato@acnsb.com.br',
    joinCode: 'ACNSB2026',
    logoUrl: 'https://via.placeholder.com/200x200/1a237e/ffffff?text=ACNSB', active: true
  },
  {
    id: 2, parentOrganizationId: null,
    name: 'Capoeira Beija-Flor', slug: 'beija-flor',
    description: 'Grupo de capoeira angola com foco na tradição musical.',
    city: 'São Paulo', state: 'SP', country: 'Brasil',
    address: 'Av. Paulista, 900 - Bela Vista',
    contactPhone: '+5511988887777', contactEmail: 'contato@beijaflor.com.br',
    joinCode: 'BF2026',
    logoUrl: 'https://via.placeholder.com/200x200/f57f17/ffffff?text=BF', active: true
  },
  {
    id: 3, parentOrganizationId: null,
    name: 'Lagoa da Saudade', slug: 'lagoa-da-saudade',
    description: 'Grupo tradicional com foco em rodas abertas e formação de novos capoeiristas.',
    city: 'Santos', state: 'SP', country: 'Brasil',
    address: 'Av. da Lagoa, 321 - Centro',
    contactPhone: '+5511999998888', contactEmail: 'contato@lagoadasaudade.com.br',
    joinCode: 'LAGOA2026',
    logoUrl: 'https://via.placeholder.com/200x200/5c6880/ffffff?text=LDS', active: true
  },
  {
    id: 4, parentOrganizationId: 1,
    name: 'ACNSB - Unidade Santos', slug: 'acnsb-santos',
    description: 'Unidade de Santos da Associação de Capoeira Nosso Senhor do Bonfim.',
    city: 'Santos', state: 'SP', country: 'Brasil',
    address: 'Rua das Pedras, 45 - Ponta da Praia',
    contactPhone: '+5513977771111', contactEmail: 'santos@acnsb.com.br',
    joinCode: 'ACNSB-SANTOS',
    logoUrl: 'https://via.placeholder.com/200x200/283593/ffffff?text=ACNSB-ST', active: true
  },
  {
    id: 5, parentOrganizationId: 1,
    name: 'ACNSB - Unidade Leste', slug: 'acnsb-leste',
    description: 'Unidade da Zona Leste da Associação de Capoeira Nosso Senhor do Bonfim.',
    city: 'Campinas', state: 'SP', country: 'Brasil',
    address: 'Rua das Artes, 456 - Jardim São João',
    contactPhone: '+5519988882222', contactEmail: 'leste@acnsb.com.br',
    joinCode: 'ACNSB-LESTE',
    logoUrl: 'https://via.placeholder.com/200x200/1565c0/ffffff?text=ACNSB-L', active: true
  }
];

// ─── Events ───────────────────────────────────────────────────────────────────
const events = [
  {
    id: 1, organizationId: null,
    title: 'Batizado e Workshop de Capoeira',
    description: 'Evento com workshop de movimentos, musicalidade e batizado de alunos.',
    startDate: '2026-05-02T13:30:00', endDate: '2026-05-02T21:00:00',
    location: 'Espaço Cultural Ginga Livre', locationUrl: 'https://maps.google.com',
    contactPhone: '+5511973333333', contactWhatsapp: '+5511973333333',
    imageUrl: 'https://event-bonfim-picture-bucket.s3.sa-east-1.amazonaws.com/bonfimEvento.jpeg',
    visibility: 'PUBLIC', isPaid: true, ticketPrice: 55,
    saleItems: [
      { name: 'CD de Ladainhas', price: 30, interestedUserIds: [] },
      { name: 'Camiseta Oficial', price: 75, interestedUserIds: [] }
    ],
    active: true, createdAt: '2026-04-01T10:00:00'
  },
  {
    id: 2, organizationId: null,
    title: 'Batizado Regional de Capoeira',
    description: 'Grande batizado regional reunindo grupos de todo o estado.',
    startDate: '2026-05-10T15:00:00', endDate: '2026-05-10T23:00:00',
    location: 'Centro Cultural SP', locationUrl: 'https://maps.google.com',
    contactPhone: '+5511988887777', contactWhatsapp: '+5511988887777',
    imageUrl: 'https://event-bonfim-picture-bucket.s3.sa-east-1.amazonaws.com/abadaCampinas.jpeg',
    visibility: 'PUBLIC', isPaid: true, ticketPrice: 40,
    saleItems: [{ name: 'CD Roda ao Vivo', price: 25, interestedUserIds: [] }],
    active: true, createdAt: '2026-04-05T10:00:00'
  },
  {
    id: 3, organizationId: 2,
    title: 'Festival e Batizado de Capoeira',
    description: 'Festival com apresentações, workshop e batizado. Capoeira Beija-Flor apresenta seu 2º Batizado.',
    startDate: '2026-05-18T14:00:00', endDate: '2026-05-19T00:00:00',
    location: 'Espaço Cultural Beija-Flor', locationUrl: 'https://maps.google.com',
    contactPhone: '+5511977776666', contactWhatsapp: '+5511977776666',
    imageUrl: 'https://event-bonfim-picture-bucket.s3.sa-east-1.amazonaws.com/sorocabaMuzenza.jpeg',
    visibility: 'PUBLIC', active: true, createdAt: '2026-04-08T10:00:00'
  },
  {
    id: 4, organizationId: null,
    title: 'Batizado Infantil de Capoeira',
    description: 'Especial para os pequenos capoeiristas!',
    startDate: '2026-05-29T13:00:00', endDate: '2026-05-30T18:00:00',
    location: 'Ginásio Municipal Zé Vitor', locationUrl: 'https://maps.google.com',
    contactPhone: '+5511966665555', contactWhatsapp: '+5511966665555',
    imageUrl: 'https://event-bonfim-picture-bucket.s3.sa-east-1.amazonaws.com/eventoCrianca.jpeg',
    visibility: 'PUBLIC', active: true, createdAt: '2026-04-10T10:00:00'
  },
  {
    id: 5, organizationId: null,
    title: 'Batizado e Troca de Cordas - Mestre Kaue',
    description: 'Cerimônia de batizado com a presença do Mestre Kaue.',
    startDate: '2026-06-07T14:00:00', endDate: '2026-06-07T22:00:00',
    location: 'Teatro Municipal', locationUrl: 'https://maps.google.com',
    contactPhone: '+5511955554444', contactWhatsapp: '+5511955554444',
    imageUrl: 'https://event-bonfim-picture-bucket.s3.sa-east-1.amazonaws.com/santosCapoeira.jpeg',
    visibility: 'PUBLIC', active: true, createdAt: '2026-04-12T10:00:00'
  },
  {
    id: 6, organizationId: 1,
    title: 'Treino Especial - Grupo ACNSB (Sede)',
    description: 'Treino interno exclusivo para membros. Visível para toda a família ACNSB.',
    startDate: '2026-05-05T09:00:00', endDate: '2026-05-05T12:00:00',
    location: 'Sede ACNSB - Campinas', locationUrl: 'https://maps.google.com',
    contactPhone: '+5511973333333', contactWhatsapp: '+5511973333333',
    imageUrl: 'https://event-bonfim-picture-bucket.s3.sa-east-1.amazonaws.com/bonfimEvento.jpeg',
    visibility: 'PRIVATE', active: true, createdAt: '2026-04-15T10:00:00'
  },
  {
    id: 7, organizationId: 1,
    title: 'Reunião de Mestres - ACNSB',
    description: 'Reunião dos mestres e professores da família ACNSB.',
    startDate: '2026-05-15T19:00:00', endDate: '2026-05-15T22:00:00',
    location: 'Sede ACNSB - Campinas', locationUrl: 'https://maps.google.com',
    contactPhone: '+5511973333333', contactWhatsapp: '+5511973333333',
    imageUrl: 'https://event-bonfim-picture-bucket.s3.sa-east-1.amazonaws.com/abadaCampinas.jpeg',
    visibility: 'PRIVATE', active: true, createdAt: '2026-04-18T10:00:00'
  },
  {
    id: 8, organizationId: 4,
    title: 'Roda de Sexta - Unidade Santos',
    description: 'Roda de capoeira semanal exclusiva para membros da Unidade Santos.',
    startDate: '2026-05-08T19:00:00', endDate: '2026-05-08T21:00:00',
    location: 'ACNSB - Unidade Santos', locationUrl: 'https://maps.google.com',
    contactPhone: '+5513977771111', contactWhatsapp: '+5513977771111',
    imageUrl: 'https://event-bonfim-picture-bucket.s3.sa-east-1.amazonaws.com/santosCapoeira.jpeg',
    visibility: 'PRIVATE', active: true, createdAt: '2026-04-20T10:00:00'
  },
  {
    id: 9, organizationId: 5,
    title: 'Oficina de Berimbau - Unidade Leste',
    description: 'Oficina sobre construção e técnica do berimbau. Exclusivo para membros da Unidade Leste.',
    startDate: '2026-05-12T18:00:00', endDate: '2026-05-12T21:00:00',
    location: 'ACNSB - Unidade Leste', locationUrl: 'https://maps.google.com',
    contactPhone: '+5519988882222', contactWhatsapp: '+5519988882222',
    imageUrl: 'https://event-bonfim-picture-bucket.s3.sa-east-1.amazonaws.com/bonfimEvento.jpeg',
    visibility: 'PRIVATE', active: true, createdAt: '2026-04-22T10:00:00'
  }
];

async function seed() {
  console.log('📦 Seeding Firestore...\n');

  // Seed organizations
  console.log('→ Organizations...');
  for (const org of organizations) {
    await setDoc(doc(db, 'organizations', String(org.id)), org);
    console.log(`  ✅ ${org.name}`);
  }

  // Seed events
  console.log('\n→ Events...');
  for (const evt of events) {
    await setDoc(doc(db, 'events', String(evt.id)), evt);
    console.log(`  ✅ ${evt.title}`);
  }

  console.log('\n✅ Seed complete!');
  console.log('\n📌 Próximos passos:');
  console.log('  1. Vá ao Firebase Console → Authentication → Add user');
  console.log('     Email: superadmin@capoeira.com  |  Senha: super123');
  console.log('  2. Copie o UID gerado e crie o documento em Firestore:');
  console.log('     Collection: users  |  Document ID: <UID>');
  console.log('     { name: "Controle de Admins", email: "superadmin@capoeira.com",');
  console.log('       role: "SUPER_ADMIN", active: true, organizationId: null,');
  console.log('       organizationUnitId: null, avatarUrl: "..." }');
  console.log('\n  3. Repita para bonfim@capoeira.com (role: SUPER_ADMIN, organizationId: 1)');
  console.log('     e demais usuários mock conforme necessário.\n');

  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });

