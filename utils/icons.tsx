import React from 'react';
import { 
    Utensils, Coffee, Beer, Pizza, PartyPopper, Mic, Ship, Mountain, 
    Flame, Church, Landmark, Anchor, Heart, Volleyball, BicepsFlexed,
    Moon, Waves, Palmtree, Hotel, Tent, Trees as Forest, 
    Trees as Park, Store, ShoppingBag, Pill as Pharmacy, Hospital, 
    Building2 as Bank, Fuel as Gas, ParkingCircle as Parking, Bus, 
    School, Palette, Library as Museum, Dumbbell as FitnessCenter, 
    Bike as DirectionsBike, Trophy as SportsTennis, Flower2 as Spa, 
    MapPin as LocationOn, Camera, Phone, Info, Star, Diamond, 
    Wind as Surfing, ClipboardList as FoodMenu
} from 'lucide-react';

// Using Lucide icons as high-quality, lightweight replacements for react-icons
export const IconMap: Record<string, React.ComponentType<any>> = {
    // Gastronomía
    MdRestaurant: Utensils,
    MdLocalCafe: Coffee,
    MdLocalBar: Beer,
    GiCocktail: Beer,
    MdBakeryDining: Coffee,
    MdFastfood: Utensils,
    BiFoodMenu: FoodMenu,
    GiPizza: Pizza,
    MdBrunchDining: Utensils,
    MdLocalPizza: Pizza,

    // Diversión
    GiPartyPopper: PartyPopper,
    BiSolidMoon: Moon,
    MdNightlife: Moon,
    MdMusicNote: Mic,
    GiMicrophone: Mic,
    BsStars: Star,

    // Surf/Playa
    BiSwim: Waves,
    MdSurfing: Surfing,
    BiBeach: Waves,
    BiSolidBeach: Waves,
    GiSailboat: Ship,
    MdKitesurfing: Surfing,
    BiSolidWaves: Waves,
    MdBeachAccess: Waves,

    // Hospedaje
    MdHotel: Hotel,
    MdVilla: Hotel,
    MdCabin: Tent,
    MdHouse: Hotel,
    MdCamping: Tent,

    // Naturaleza
    BsTree: Forest,
    PiTree: Forest,
    GiMountaintop: Mountain,
    MdForest: Forest,
    GiCampfire: Flame,
    MdPark: Park,

    // Servicios
    MdStore: Store,
    MdShoppingBag: ShoppingBag,
    MdLocalPharmacy: Pharmacy,
    MdLocalHospital: Hospital,
    MdAccountBalance: Bank,
    MdLocalGasStation: Gas,
    MdLocalParking: Parking,
    MdDirectionsBus: Bus,
    MdSchool: School,

    // Cultura
    GiChurch: Church,
    MdPalette: Palette,
    GiGreekTemple: Landmark,
    GiAnchor: Anchor,
    MdMuseum: Museum,
    GiHeartInside: Heart,

    // Deporte
    MdFitnessCenter: FitnessCenter,
    MdDirectionsBike: DirectionsBike,
    GiVolleyballBall: Volleyball,
    GiBiceps: BicepsFlexed,
    MdSportsTennis: SportsTennis,
    MdSpa: Spa,

    // Otros
    MdLocationOn: LocationOn,
    MdPhotoCamera: Camera,
    MdCall: Phone,
    MdInfo: Info,
    MdStar: Star,
    MdDiamond: Diamond,
};

export const getIconComponent = (iconName: string): React.ComponentType<any> | null => {
    return IconMap[iconName] || null;
};
