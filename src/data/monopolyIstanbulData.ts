import type { Property, PropertyGroup } from '../types/index.ts';

export interface PropertySeed {
  property_key: string;
  name: string;
  group_key: PropertyGroup;
  group_name: string;
  group_color: string;
  type: 'street' | 'station' | 'utility';
  price: number;
  mortgage_value: number;
  rent_base: number;
  rent_house_1: number;
  rent_house_2: number;
  rent_house_3: number;
  rent_house_4: number;
  rent_hotel: number;
  house_cost: number;
  position: number;
}

export const MONOPOLY_ISTANBUL_PROPERTIES: PropertySeed[] = [
  // 1. Kahverengi (2 mülk)
  {
    property_key: 'kasimpasa',
    name: 'Kasımpaşa',
    group_key: 'brown',
    group_name: 'Kahverengi',
    group_color: '#8B4513',
    type: 'street',
    price: 60,
    mortgage_value: 30,
    rent_base: 2,
    rent_house_1: 10,
    rent_house_2: 30,
    rent_house_3: 90,
    rent_house_4: 160,
    rent_hotel: 250,
    house_cost: 50,
    position: 1,
  },
  {
    property_key: 'dolapdere',
    name: 'Dolapdere',
    group_key: 'brown',
    group_name: 'Kahverengi',
    group_color: '#8B4513',
    type: 'street',
    price: 60,
    mortgage_value: 30,
    rent_base: 4,
    rent_house_1: 20,
    rent_house_2: 60,
    rent_house_3: 180,
    rent_house_4: 320,
    rent_hotel: 450,
    house_cost: 50,
    position: 2,
  },

  // İstasyon 1
  {
    property_key: 'haydarpasa_gari',
    name: 'Haydarpaşa Garı',
    group_key: 'station',
    group_name: 'İstasyonlar',
    group_color: '#64748B',
    type: 'station',
    price: 200,
    mortgage_value: 100,
    rent_base: 25,
    rent_house_1: 50,
    rent_house_2: 100,
    rent_house_3: 200,
    rent_house_4: 200,
    rent_hotel: 200,
    house_cost: 0,
    position: 3,
  },

  // 2. Açık Mavi (3 mülk)
  {
    property_key: 'sultanahmet',
    name: 'Sultanahmet',
    group_key: 'light_blue',
    group_name: 'Açık Mavi',
    group_color: '#38BDF8',
    type: 'street',
    price: 100,
    mortgage_value: 50,
    rent_base: 6,
    rent_house_1: 30,
    rent_house_2: 90,
    rent_house_3: 270,
    rent_house_4: 400,
    rent_hotel: 550,
    house_cost: 50,
    position: 4,
  },
  {
    property_key: 'karakoy',
    name: 'Karaköy',
    group_key: 'light_blue',
    group_name: 'Açık Mavi',
    group_color: '#38BDF8',
    type: 'street',
    price: 100,
    mortgage_value: 50,
    rent_base: 6,
    rent_house_1: 30,
    rent_house_2: 90,
    rent_house_3: 270,
    rent_house_4: 400,
    rent_hotel: 550,
    house_cost: 50,
    position: 5,
  },
  {
    property_key: 'sirkeci',
    name: 'Sirkeci',
    group_key: 'light_blue',
    group_name: 'Açık Mavi',
    group_color: '#38BDF8',
    type: 'street',
    price: 120,
    mortgage_value: 60,
    rent_base: 8,
    rent_house_1: 40,
    rent_house_2: 100,
    rent_house_3: 300,
    rent_house_4: 450,
    rent_hotel: 600,
    house_cost: 50,
    position: 6,
  },

  // 3. Pembe (3 mülk)
  {
    property_key: 'beyoglu',
    name: 'Beyoğlu',
    group_key: 'pink',
    group_name: 'Pembe',
    group_color: '#F472B6',
    type: 'street',
    price: 140,
    mortgage_value: 70,
    rent_base: 10,
    rent_house_1: 50,
    rent_house_2: 150,
    rent_house_3: 450,
    rent_house_4: 625,
    rent_hotel: 750,
    house_cost: 100,
    position: 7,
  },
  // Kamu 1
  {
    property_key: 'elektrik_idaresi',
    name: 'Elektrik İdaresi',
    group_key: 'utility',
    group_name: 'Kamu Kuruluşları',
    group_color: '#F59E0B',
    type: 'utility',
    price: 150,
    mortgage_value: 75,
    rent_base: 28, // 4 x ortalama 7 zar
    rent_house_1: 70, // 10 x ortalama 7 zar
    rent_house_2: 70,
    rent_house_3: 70,
    rent_house_4: 70,
    rent_hotel: 70,
    house_cost: 0,
    position: 8,
  },
  {
    property_key: 'besiktas',
    name: 'Beşiktaş',
    group_key: 'pink',
    group_name: 'Pembe',
    group_color: '#F472B6',
    type: 'street',
    price: 140,
    mortgage_value: 70,
    rent_base: 10,
    rent_house_1: 50,
    rent_house_2: 150,
    rent_house_3: 450,
    rent_house_4: 625,
    rent_hotel: 750,
    house_cost: 100,
    position: 9,
  },
  {
    property_key: 'taksim',
    name: 'Taksim',
    group_key: 'pink',
    group_name: 'Pembe',
    group_color: '#F472B6',
    type: 'street',
    price: 160,
    mortgage_value: 80,
    rent_base: 12,
    rent_house_1: 60,
    rent_house_2: 180,
    rent_house_3: 500,
    rent_house_4: 700,
    rent_hotel: 900,
    house_cost: 100,
    position: 10,
  },

  // İstasyon 2
  {
    property_key: 'sirkeci_gari',
    name: 'Sirkeci Garı',
    group_key: 'station',
    group_name: 'İstasyonlar',
    group_color: '#64748B',
    type: 'station',
    price: 200,
    mortgage_value: 100,
    rent_base: 25,
    rent_house_1: 50,
    rent_house_2: 100,
    rent_house_3: 200,
    rent_house_4: 200,
    rent_hotel: 200,
    house_cost: 0,
    position: 11,
  },

  // 4. Turuncu (3 mülk)
  {
    property_key: 'harbiye',
    name: 'Harbiye',
    group_key: 'orange',
    group_name: 'Turuncu',
    group_color: '#FB923C',
    type: 'street',
    price: 180,
    mortgage_value: 90,
    rent_base: 14,
    rent_house_1: 70,
    rent_house_2: 200,
    rent_house_3: 550,
    rent_house_4: 750,
    rent_hotel: 950,
    house_cost: 100,
    position: 12,
  },
  {
    property_key: 'sisli',
    name: 'Şişli',
    group_key: 'orange',
    group_name: 'Turuncu',
    group_color: '#FB923C',
    type: 'street',
    price: 180,
    mortgage_value: 90,
    rent_base: 14,
    rent_house_1: 70,
    rent_house_2: 200,
    rent_house_3: 550,
    rent_house_4: 750,
    rent_hotel: 950,
    house_cost: 100,
    position: 13,
  },
  {
    property_key: 'mecidiyekoy',
    name: 'Mecidiyeköy',
    group_key: 'orange',
    group_name: 'Turuncu',
    group_color: '#FB923C',
    type: 'street',
    price: 200,
    mortgage_value: 100,
    rent_base: 16,
    rent_house_1: 80,
    rent_house_2: 220,
    rent_house_3: 600,
    rent_house_4: 800,
    rent_hotel: 1000,
    house_cost: 100,
    position: 14,
  },

  // 5. Kırmızı (3 mülk)
  {
    property_key: 'bostanci',
    name: 'Bostancı',
    group_key: 'red',
    group_name: 'Kırmızı',
    group_color: '#EF4444',
    type: 'street',
    price: 220,
    mortgage_value: 110,
    rent_base: 18,
    rent_house_1: 90,
    rent_house_2: 250,
    rent_house_3: 700,
    rent_house_4: 875,
    rent_hotel: 1050,
    house_cost: 150,
    position: 15,
  },
  {
    property_key: 'erenkoy',
    name: 'Erenköy',
    group_key: 'red',
    group_name: 'Kırmızı',
    group_color: '#EF4444',
    type: 'street',
    price: 220,
    mortgage_value: 110,
    rent_base: 18,
    rent_house_1: 90,
    rent_house_2: 250,
    rent_house_3: 700,
    rent_house_4: 875,
    rent_hotel: 1050,
    house_cost: 150,
    position: 16,
  },
  {
    property_key: 'caddebostan',
    name: 'Caddebostan',
    group_key: 'red',
    group_name: 'Kırmızı',
    group_color: '#EF4444',
    type: 'street',
    price: 240,
    mortgage_value: 120,
    rent_base: 20,
    rent_house_1: 100,
    rent_house_2: 300,
    rent_house_3: 750,
    rent_house_4: 925,
    rent_hotel: 1100,
    house_cost: 150,
    position: 17,
  },

  // İstasyon 3
  {
    property_key: 'kadikoy_iskelesi',
    name: 'Kadıköy İskelesi',
    group_key: 'station',
    group_name: 'İstasyonlar',
    group_color: '#64748B',
    type: 'station',
    price: 200,
    mortgage_value: 100,
    rent_base: 25,
    rent_house_1: 50,
    rent_house_2: 100,
    rent_house_3: 200,
    rent_house_4: 200,
    rent_hotel: 200,
    house_cost: 0,
    position: 18,
  },

  // 6. Sarı (3 mülk)
  {
    property_key: 'nisantasi',
    name: 'Nişantaşı',
    group_key: 'yellow',
    group_name: 'Sarı',
    group_color: '#EAB308',
    type: 'street',
    price: 260,
    mortgage_value: 130,
    rent_base: 22,
    rent_house_1: 110,
    rent_house_2: 330,
    rent_house_3: 800,
    rent_house_4: 975,
    rent_hotel: 1150,
    house_cost: 150,
    position: 19,
  },
  {
    property_key: 'tesvikiye',
    name: 'Teşvikiye',
    group_key: 'yellow',
    group_name: 'Sarı',
    group_color: '#EAB308',
    type: 'street',
    price: 260,
    mortgage_value: 130,
    rent_base: 22,
    rent_house_1: 110,
    rent_house_2: 330,
    rent_house_3: 800,
    rent_house_4: 975,
    rent_hotel: 1150,
    house_cost: 150,
    position: 20,
  },
  // Kamu 2
  {
    property_key: 'sular_idaresi',
    name: 'Sular İdaresi',
    group_key: 'utility',
    group_name: 'Kamu Kuruluşları',
    group_color: '#F59E0B',
    type: 'utility',
    price: 150,
    mortgage_value: 75,
    rent_base: 28, // 4 x ortalama 7 zar
    rent_house_1: 70, // 10 x ortalama 7 zar
    rent_house_2: 70,
    rent_house_3: 70,
    rent_house_4: 70,
    rent_hotel: 70,
    house_cost: 0,
    position: 21,
  },
  {
    property_key: 'macka',
    name: 'Maçka',
    group_key: 'yellow',
    group_name: 'Sarı',
    group_color: '#EAB308',
    type: 'street',
    price: 280,
    mortgage_value: 140,
    rent_base: 24,
    rent_house_1: 120,
    rent_house_2: 360,
    rent_house_3: 850,
    rent_house_4: 1025,
    rent_hotel: 1200,
    house_cost: 150,
    position: 22,
  },

  // 7. Yeşil (3 mülk)
  {
    property_key: 'levent',
    name: 'Levent',
    group_key: 'green',
    group_name: 'Yeşil',
    group_color: '#22C55E',
    type: 'street',
    price: 300,
    mortgage_value: 150,
    rent_base: 26,
    rent_house_1: 130,
    rent_house_2: 390,
    rent_house_3: 900,
    rent_house_4: 1100,
    rent_hotel: 1275,
    house_cost: 200,
    position: 23,
  },
  {
    property_key: 'etiler',
    name: 'Etiler',
    group_key: 'green',
    group_name: 'Yeşil',
    group_color: '#22C55E',
    type: 'street',
    price: 300,
    mortgage_value: 150,
    rent_base: 26,
    rent_house_1: 130,
    rent_house_2: 390,
    rent_house_3: 900,
    rent_house_4: 1100,
    rent_hotel: 1275,
    house_cost: 200,
    position: 24,
  },
  // İstasyon 4
  {
    property_key: 'kabatas_iskelesi',
    name: 'Kabataş İskelesi',
    group_key: 'station',
    group_name: 'İstasyonlar',
    group_color: '#64748B',
    type: 'station',
    price: 200,
    mortgage_value: 100,
    rent_base: 25,
    rent_house_1: 50,
    rent_house_2: 100,
    rent_house_3: 200,
    rent_house_4: 200,
    rent_hotel: 200,
    house_cost: 0,
    position: 25,
  },
  {
    property_key: 'bebek',
    name: 'Bebek',
    group_key: 'green',
    group_name: 'Yeşil',
    group_color: '#22C55E',
    type: 'street',
    price: 320,
    mortgage_value: 160,
    rent_base: 28,
    rent_house_1: 150,
    rent_house_2: 450,
    rent_house_3: 1000,
    rent_house_4: 1200,
    rent_hotel: 1400,
    house_cost: 200,
    position: 26,
  },

  // 8. Lacivert (2 mülk)
  {
    property_key: 'yenikoy',
    name: 'Yeniköy',
    group_key: 'dark_blue',
    group_name: 'Lacivert',
    group_color: '#1E40AF',
    type: 'street',
    price: 350,
    mortgage_value: 175,
    rent_base: 35,
    rent_house_1: 175,
    rent_house_2: 500,
    rent_house_3: 1100,
    rent_house_4: 1300,
    rent_hotel: 1500,
    house_cost: 200,
    position: 27,
  },
  {
    property_key: 'tarabya',
    name: 'Tarabya',
    group_key: 'dark_blue',
    group_name: 'Lacivert',
    group_color: '#1E40AF',
    type: 'street',
    price: 400,
    mortgage_value: 200,
    rent_base: 50,
    rent_house_1: 200,
    rent_house_2: 600,
    rent_house_3: 1400,
    rent_house_4: 1700,
    rent_hotel: 2000,
    house_cost: 200,
    position: 28,
  },
];

/**
 * Calculates current rent according to official Monopoly rules:
 * 1. Mortgaged property -> 0 ₺
 * 2. Street with hotel -> rent_hotel
 * 3. Street with houses -> rent_house_N
 * 4. Street without houses:
 *    - If owner owns full color group and none have houses/hotels: rent is DOUBLE the base rent
 *    - Otherwise standard rent_base
 * 5. Station:
 *    - 1 station owned: 25 ₺
 *    - 2 stations owned: 50 ₺
 *    - 3 stations owned: 100 ₺
 *    - 4 stations owned: 200 ₺
 * 6. Utility:
 *    - 1 utility: 4 x dice (or standard 28 ₺)
 *    - 2 utilities: 10 x dice (or standard 70 ₺)
 */
export function calculateCurrentRent(
  property: Property,
  allPropertiesInRoom: Property[],
  customDiceRoll?: number
): { amount: number; description: string } {
  if (property.is_mortgaged) {
    return { amount: 0, description: 'İpotekli mülkten kira alınmaz' };
  }

  if (!property.owner_id) {
    return { amount: 0, description: 'Mülkün sahibi yok' };
  }

  // Stations
  if (property.type === 'station') {
    const ownedStations = allPropertiesInRoom.filter(
      (p) => p.group_key === 'station' && p.owner_id === property.owner_id
    ).length;

    let amount = 25;
    if (ownedStations === 2) amount = 50;
    else if (ownedStations === 3) amount = 100;
    else if (ownedStations >= 4) amount = 200;

    return {
      amount,
      description: `${ownedStations} adet istasyon sahipliği: ${amount} ₺`,
    };
  }

  // Utilities
  if (property.type === 'utility') {
    const ownedUtilities = allPropertiesInRoom.filter(
      (p) => p.group_key === 'utility' && p.owner_id === property.owner_id
    ).length;

    const dice = customDiceRoll && customDiceRoll > 0 ? customDiceRoll : 7;
    const multiplier = ownedUtilities >= 2 ? 10 : 4;
    const amount = dice * multiplier;

    return {
      amount,
      description: `${ownedUtilities} kamu kuruluşu (${multiplier}x${dice} zar): ${amount} ₺`,
    };
  }

  // Streets
  if (property.hotel_count > 0) {
    return {
      amount: property.rent_hotel,
      description: `Otel kirası: ${property.rent_hotel} ₺`,
    };
  }

  if (property.house_count > 0) {
    const houseRents = [
      property.rent_base,
      property.rent_house_1,
      property.rent_house_2,
      property.rent_house_3,
      property.rent_house_4,
    ];
    const amount = houseRents[property.house_count] || property.rent_house_4;
    return {
      amount,
      description: `${property.house_count} evli kira: ${amount} ₺`,
    };
  }

  // Check if owner owns all properties of the group (Color monopoly)
  const groupProperties = allPropertiesInRoom.filter(
    (p) => p.group_key === property.group_key
  );
  const ownsAllInGroup = groupProperties.every(
    (p) => p.owner_id === property.owner_id
  );
  const noBuildingsInGroup = groupProperties.every(
    (p) => p.house_count === 0 && p.hotel_count === 0
  );

  if (ownsAllInGroup && noBuildingsInGroup) {
    const doubleRent = property.rent_base * 2;
    return {
      amount: doubleRent,
      description: `Tam renk seti (2 katı arsa kirası): ${doubleRent} ₺`,
    };
  }

  return {
    amount: property.rent_base,
    description: `Standart arsa kirası: ${property.rent_base} ₺`,
  };
}

/**
 * Validates whether player can build a house/hotel according to official Monopoly rules:
 * 1. Player must own all properties in the color group
 * 2. None of the properties in the group can be mortgaged
 * 3. Even building rule: cannot build a house on this property if any other property in the group has fewer houses
 * 4. To build hotel: all properties in group must have 4 houses
 */
export function validateBuildingRule(
  property: Property,
  groupProperties: Property[]
): { canBuild: boolean; error?: string; cost: number; action: 'house' | 'hotel' } {
  if (property.type !== 'street') {
    return { canBuild: false, error: 'Yalnızca arsalara ev/otel yapılabilir', cost: 0, action: 'house' };
  }

  const ownsAll = groupProperties.every((p) => p.owner_id === property.owner_id);
  if (!ownsAll) {
    return {
      canBuild: false,
      error: `Ev yapabilmek için tüm ${property.group_name} mülklerine sahip olmalısınız`,
      cost: property.house_cost,
      action: 'house',
    };
  }

  const anyMortgaged = groupProperties.some((p) => p.is_mortgaged);
  if (anyMortgaged) {
    return {
      canBuild: false,
      error: 'Bu renk grubunda ipotekli mülk varken ev inşa edilemez',
      cost: property.house_cost,
      action: 'house',
    };
  }

  if (property.hotel_count >= 1) {
    return {
      canBuild: false,
      error: 'Bu mülkte zaten bir otel var, daha fazla bina yapılamaz',
      cost: 0,
      action: 'hotel',
    };
  }

  // Check even building rule
  if (property.house_count < 4) {
    const minHousesInGroup = Math.min(...groupProperties.map((p) => p.house_count));
    if (property.house_count > minHousesInGroup) {
      return {
        canBuild: false,
        error: `Eşit yapılaşma kuralı: Önce diğer ${property.group_name} mülklerine de ${property.house_count}. evi yapmalısınız`,
        cost: property.house_cost,
        action: 'house',
      };
    }
    return {
      canBuild: true,
      cost: property.house_cost,
      action: 'house',
    };
  }

  // Wants to build hotel (has 4 houses)
  const allHave4Houses = groupProperties.every((p) => p.house_count === 4 || p.hotel_count === 1);
  if (!allHave4Houses) {
    return {
      canBuild: false,
      error: `Otel dikmek için gruptaki tüm mülklerde 4 ev bulunmalıdır`,
      cost: property.house_cost,
      action: 'hotel',
    };
  }

  return {
    canBuild: true,
    cost: property.house_cost,
    action: 'hotel',
  };
}
