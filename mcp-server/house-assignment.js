// Comprehensive House Assignment for Game of Thrones Characters

const HOUSE_ASSIGNMENTS = {
  // House Stark
  'House Stark': [
    'Ned', 'Eddard', 'Catelyn', 'Robb', 'Sansa', 'Arya', 'Bran', 'Rickon', 'Jon', 'Benjen', 'Lyanna', 'Brandon', 'Rickard',
    'Greatjon', 'Rodrik', 'Jory', 'Hodor', 'Old Nan', 'Luwin', 'Osha', 'Theon', 'Jeyne', 'Gendry', 'Hot Pie', 'Lommy',
    'Mycah', 'Septa Mordane', 'Tomard', 'Varly', 'Waymar', 'Will', 'Gared', 'Jaremy', 'Yoren', 'Arya', 'Sansa'
  ],
  
  // House Lannister
  'House Lannister': [
    'Tywin', 'Cersei', 'Jaime', 'Tyrion', 'Joffrey', 'Myrcella', 'Tommen', 'Kevan', 'Lancel', 'Joanna', 'Joyeuse',
    'Shae', 'Bronn', 'Pycelle', 'Ilyn', 'Gregor', 'Sandor', 'Meryn', 'Mord', 'Vardis', 'Lysa', 'Robin', 'Petyr',
    'Little Bird', 'Varys', 'Ros', 'Shae', 'Tysha', 'Tobho Mott', 'Hugh of the Vale', 'Marillion', 'Masha'
  ],
  
  // House Targaryen
  'House Targaryen': [
    'Daenerys', 'Viserys', 'Rhaegar', 'Aerys', 'Rhaego', 'Aemon', 'Aegon', 'Steffon', 'Rhaella', 'Jaehaerys', 'Alysanne'
  ],
  
  // House Baratheon
  'House Baratheon': [
    'Robert', 'Stannis', 'Renly', 'Steffon', 'Cassana', 'Shireen', 'Gendry', 'Mya', 'Bella', 'Edric', 'Tommen', 'Joffrey'
  ],
  
  // House Greyjoy
  'House Greyjoy': [
    'Balon', 'Theon', 'Asha', 'Yara', 'Euron', 'Victarion', 'Aeron', 'Rodrik', 'Maron', 'Harlon', 'Quellon'
  ],
  
  // House Tyrell
  'House Tyrell': [
    'Mace', 'Margaery', 'Loras', 'Olenna', 'Garlan', 'Willas', 'Leo', 'Alla', 'Megga', 'Elia', 'Luthor', 'Alerie'
  ],
  
  // House Martell
  'House Martell': [
    'Doran', 'Oberyn', 'Elia', 'Arianne', 'Quentyn', 'Trystane', 'Ellaria', 'Nymeria', 'Tyene', 'Obara', 'Sarella'
  ],
  
  // House Arryn
  'House Arryn': [
    'Jon Arryn', 'Lysa', 'Robin', 'Sweetrobin', 'Jasper', 'Ronnel', 'Alys', 'Denys', 'Elbert', 'Alyssa'
  ],
  
  // House Tully
  'House Tully': [
    'Hoster', 'Catelyn', 'Lysa', 'Edmure', 'Brynden', 'Blackfish', 'Minisa', 'Roslin', 'Patrek', 'Mallister'
  ],
  
  // Night's Watch
  'Night\'s Watch': [
    'Jon', 'Sam', 'Pyp', 'Grenn', 'Rast', 'Othor', 'Will', 'Gared', 'Waymar', 'Jaremy', 'Alliser', 'Janos',
    'Bowen', 'Othell', 'Yoren', 'Benjen', 'Qhorin', 'Mance', 'Tormund', 'Rattleshirt', 'Craster', 'Gilly'
  ],
  
  // Free Cities
  'Free Cities': [
    'Daenerys', 'Viserys', 'Illyrio', 'Jorah', 'Doreah', 'Irri', 'Jhiqui', 'Rakharo', 'Aggo', 'Qotho', 'Mago',
    'Mirri Maz Dur', 'Xaro', 'Pyat Pree', 'Quaithe', 'Hizdahr', 'Skahaz', 'Reznak', 'Galazza', 'Green Grace'
  ],
  
  // Dothraki
  'Dothraki': [
    'Drogo', 'Rhaego', 'Qotho', 'Mago', 'Aggo', 'Rakharo', 'Irri', 'Jhiqui', 'Doreah', 'Mirri Maz Dur'
  ],
  
  // Smallfolk
  'Smallfolk': [
    'Hot Pie', 'Lommy', 'Mycah', 'Ros', 'Shae', 'Tysha', 'Masha', 'Marillion', 'Hugh of the Vale', 'Tobho Mott'
  ]
};

// Function to assign house based on character name
function assignHouse(characterName) {
  const name = characterName.toLowerCase();
  
  // Check each house for matches
  for (const [house, characters] of Object.entries(HOUSE_ASSIGNMENTS)) {
    for (const char of characters) {
      if (name === char.toLowerCase() || name.includes(char.toLowerCase())) {
        return house;
      }
    }
  }
  
  // Special cases and patterns
  if (name.includes('stark')) return 'House Stark';
  if (name.includes('lannister')) return 'House Lannister';
  if (name.includes('targaryen')) return 'House Targaryen';
  if (name.includes('baratheon')) return 'House Baratheon';
  if (name.includes('greyjoy')) return 'House Greyjoy';
  if (name.includes('tyrell')) return 'House Tyrell';
  if (name.includes('martell')) return 'House Martell';
  if (name.includes('arryn')) return 'House Arryn';
  if (name.includes('tully')) return 'House Tully';
  
  // Default fallback
  return 'Unknown House';
}

module.exports = { assignHouse, HOUSE_ASSIGNMENTS };
