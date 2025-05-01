import bcrypt from 'bcrypt';

async function generateHash() {
  const password = 'subadmin123';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password:', password);
  console.log('Hash:', hash);
}

generateHash();