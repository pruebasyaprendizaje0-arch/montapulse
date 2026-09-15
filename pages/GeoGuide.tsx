import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Compass, ChevronLeft, ArrowRight, Sparkles, HelpCircle, Utensils, Hotel, Waves, Bus, TreePine } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';

interface GuideData {
  title: string;
  locality: string;
  description: string;
  heroImage?: string;
  sections: Array<{ heading: string; content: string }>;
  faqs: Array<{ q: string; a: string }>;
  relatedHubs: Array<{ label: string; url: string; icon: string }>;
}

const GUIDES: Record<string, GuideData> = {
  'ruta-del-spondylus': {
    title: 'Guía Turística de la Ruta del Spondylus',
    locality: 'Santa Elena, Ecuador',
    description: 'Recorre el corredor Manglaralto – Montañita – Olón: playas vírgenes, gastronomía marina, olas de surf internacional y tranquilidad costera en el Pacífico ecuatoriano.',
    heroImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200',
    sections: [
      {
        heading: 'El Corredor Manglaralto – Montañita – Olón',
        content: 'La Ruta del Spondylus en Santa Elena conecta tres pueblos con identidades complementarias: la tranquilidad tradicional y mariscos frescos de Manglaralto, la energía vibrante y surf de Montañita, y la serenidad residencial y bosque tropical de Olón.'
      },
      {
        heading: 'Cómo Moverse entre Localidades',
        content: 'Los tres pueblos están conectados por la carretera E15 a menos de 5 minutos de distancia entre sí. Puedes desplazarte en buses locales (CITUP, Manglaralto), taxis locales o mototaxis comunales.'
      },
      {
        heading: 'Mejor Época para Visitar',
        content: 'La temporada de sol y playa va de diciembre a mayo con aguas cálidas y excelente oleaje. De junio a noviembre el clima es fresco, ideal para senderismo, ecoturismo y avistamiento de ballenas jorobadas.'
      }
    ],
    faqs: [
      {
        q: '¿Cuánto tiempo toma viajar entre Montañita y Olón?',
        a: 'El trayecto toma aproximadamente 5 minutos en vehículo o bus (3.5 km por la carretera E15).'
      },
      {
        q: '¿Qué moneda y métodos de pago se usan en la zona?',
        a: 'La moneda oficial es el Dólar estadounidense (USD). Se recomienda llevar efectivo para pequeños comercios y transferencias Banco Pichincha o Deuna para locales medianos.'
      }
    ],
    relatedHubs: [
      { label: 'Restaurantes en Montañita', url: '/localidad/montanita/restaurantes', icon: 'food' },
      { label: 'Hoteles en Olón', url: '/localidad/olon/hoteles', icon: 'hotel' },
      { label: 'Servicios en Manglaralto', url: '/localidad/manglaralto/restaurantes', icon: 'store' }
    ]
  },
  'la-punta-montanita': {
    title: 'La Punta de Montañita: Surf, Hospedaje y Relax',
    locality: 'Montañita',
    description: 'Guía del sector de La Punta: la rompiente de olas más famosa de Ecuador, hostales tranquilos frente a la playa y restaurantes con vista a la ola.',
    heroImage: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=1200',
    sections: [
      {
        heading: 'La Meca del Surf en Ecuador',
        content: 'La Punta cuenta con una ola derecha consistente sobre fondo de roca y arena que funciona con oleajes del norte y sur. Es el punto de encuentro de surfistas locales e internacionales.'
      },
      {
        heading: 'Ambiente Residencial y Tranquilo',
        content: 'A diferencia del centro de Montañita, el sector de La Punta ofrece descanso nocturno, cafés frente al mar, escuelas de surf profesionales y alojamientos enfocados en relax.'
      }
    ],
    faqs: [
      {
        q: '¿A qué distancia está La Punta del centro de Montañita?',
        a: 'Está a solo 800 metros del centro, unos 8 a 10 minutos caminando por la playa o la calle principal.'
      },
      {
        q: '¿Es apto para surfistas principiantes?',
        a: 'La orilla es perfecta para clases de iniciación con instructores, mientras que la punta exterior es para surfistas intermedios y avanzados.'
      }
    ],
    relatedHubs: [
      { label: 'Escuelas de Surf', url: '/localidad/montanita/escuelas-surf', icon: 'surf' },
      { label: 'Hoteles en La Punta', url: '/localidad/montanita/hoteles', icon: 'hotel' }
    ]
  },
  'el-tigrillo-montanita': {
    title: 'Barrio El Tigrillo: Cabañas, Naturaleza y Paz',
    locality: 'Montañita',
    description: 'Descubre el Barrio El Tigrillo en Montañita: alojamientos ecológicos, silencio absoluto, senderos verdes y suites para nómadas digitales.',
    heroImage: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&q=80&w=1200',
    sections: [
      {
        heading: 'Un Oasis Verde a Pocos Pasos de la Playa',
        content: 'El Tigrillo es el barrio montañoso y residencial de Montañita. Rodeado de vegetación tropical y fauna costera, es el lugar predilecto para estancias largas y nómadas digitales.'
      },
      {
        heading: 'Hospedajes con Piscina y Garaje Privado',
        content: 'En este sector se concentran hostales y cabañas familiares como Hostal Roses, con facilidades de estacionamiento, áreas de coworking y tranquilidad nocturna garantizada.'
      }
    ],
    faqs: [
      {
        q: '¿Cómo llegar al Barrio El Tigrillo desde la terminal de buses?',
        a: 'Cruzas el puente peatonal o vehicular hacia el este; está a 200 metros del puente principal de Montañita.'
      },
      {
        q: '¿Hay buen internet en El Tigrillo?',
        a: 'La mayoría de alojamientos cuentan con conexión de fibra óptica y Starlink orientados a teletrabajo.'
      }
    ],
    relatedHubs: [
      { label: 'Hospedajes en El Tigrillo', url: '/localidad/montanita/hoteles', icon: 'hotel' },
      { label: 'Restaurantes de Montañita', url: '/localidad/montanita/restaurantes', icon: 'food' }
    ]
  },
  'santuario-olon': {
    title: 'Santuario Blanca Estrella de la Mar en Olón',
    locality: 'Olón',
    description: 'Guía de visita al Santuario de Olón: mirador panorámico sobre el acantilado, arquitectura naval y atardeceres sobre el Pacífico.',
    heroImage: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&q=80&w=1200',
    sections: [
      {
        heading: 'El Mirador del Acantilado',
        content: 'Ubicado en el peñón que divide Montañita de Olón a más de 100 metros sobre el nivel del mar, ofrece una de las vistas más espectaculares de la costa de Santa Elena.'
      },
      {
        heading: 'Historia y Peregrinación',
        content: 'Construido en forma de proa de barco en honor a la Virgen de la Rosa Mística, es un punto de referencia espiritual y turístico clave del corredor.'
      }
    ],
    faqs: [
      {
        q: '¿Tiene costo el ingreso al Santuario de Olón?',
        a: 'El acceso es libre y gratuito para todos los visitantes durante el día.'
      },
      {
        q: '¿Cómo subir al Santuario?',
        a: 'Se puede subir a pie por la escalinata desde la playa o en vehículo por el acceso asfaltado desde la carretera E15.'
      }
    ],
    relatedHubs: [
      { label: 'Restaurantes en Olón', url: '/localidad/olon/restaurantes', icon: 'food' },
      { label: 'Hoteles en Olón', url: '/localidad/olon/hoteles', icon: 'hotel' }
    ]
  },
  'terminal-clp-montanita': {
    title: 'Terminal de Buses CLP y Transporte en Montañita',
    locality: 'Montañita',
    description: 'Información y horarios de transporte en Montañita: cooperativa CLP hacia Guayaquil, rutas de buses locales y paradas de taxis en Santa Elena.',
    sections: [
      {
        heading: 'Cooperativa Libertad Peninsular (CLP)',
        content: 'La terminal principal de CLP se encuentra sobre la carretera E15 en la entrada de Montañita, con frecuencias diarias directas hacia el Terminal Terrestre de Guayaquil.'
      },
      {
        heading: 'Transporte Local hacia Olón y Manglaralto',
        content: 'Frente a la parada principal circulan continuamente buses interparroquiales y camionetas de transporte comunal hacia los pueblos vecinos por una tarifa aproximada de $0.50 a $0.75.'
      }
    ],
    faqs: [
      {
        q: '¿Cuánto dura el viaje en bus de Guayaquil a Montañita?',
        a: 'El viaje directo en bus CLP toma aproximadamente 3 horas a 3 horas y media.'
      },
      {
        q: '¿Dónde comprar los boletos de bus?',
        a: 'Se adquieren directamente en las ventanillas de la terminal CLP en Montañita o en la terminal de Guayaquil.'
      }
    ],
    relatedHubs: [
      { label: 'Hospedajes en Montañita', url: '/localidad/montanita/hoteles', icon: 'hotel' },
      { label: 'Directorio de Negocios', url: '/explore', icon: 'store' }
    ]
  }
};

export const GeoGuide: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathParts = location.pathname.split('/').filter(Boolean);
  const slug = location.pathname === '/ruta-del-spondylus' ? 'ruta-del-spondylus' : (pathParts[pathParts.length - 1] || 'ruta-del-spondylus');
  const guide = GUIDES[slug] || GUIDES['ruta-del-spondylus'];

  useSEO({
    title: `${guide.title} | Ubícame`,
    description: guide.description,
    url: `https://www.ubicame.info${location.pathname}`
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      {/* Header Bar */}
      <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-white/5 px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/explore')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-xs font-bold text-slate-300 hover:text-white transition-all border border-white/10"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver al Mapa</span>
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Guía Oficial Ubícame
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative max-w-4xl mx-auto px-6 pt-8 pb-4">
        {guide.heroImage && (
          <div className="relative h-64 sm:h-80 rounded-[2.5rem] overflow-hidden mb-8 border border-white/10 shadow-2xl">
            <img src={guide.heroImage} alt={guide.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg mb-2">
                <MapPin className="w-3 h-3" /> {guide.locality}
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                {guide.title}
              </h1>
            </div>
          </div>
        )}

        {!guide.heroImage && (
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg mb-3">
              <MapPin className="w-3 h-3" /> {guide.locality}
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {guide.title}
            </h1>
          </div>
        )}

        <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal mb-10 border-l-2 border-orange-500 pl-4 py-1">
          {guide.description}
        </p>

        {/* Content Sections */}
        <div className="space-y-8 mb-12">
          {guide.sections.map((section, idx) => (
            <div key={idx} className="bg-slate-900/60 p-6 sm:p-8 rounded-[2rem] border border-white/5">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-3 flex items-center gap-2">
                <Compass className="w-5 h-5 text-orange-400" />
                {section.heading}
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* FAQ Section for AEO */}
        {guide.faqs && guide.faqs.length > 0 && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 sm:p-8 rounded-[2.5rem] border border-orange-500/20 mb-12 space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <HelpCircle className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-black text-white uppercase tracking-wider">
                Preguntas Frecuentes (FAQ)
              </h3>
            </div>
            <div className="space-y-4">
              {guide.faqs.map((faq, i) => (
                <div key={i} className="p-4 bg-slate-800/40 rounded-2xl border border-white/5 space-y-2">
                  <h4 className="text-sm font-bold text-orange-300 flex items-start gap-2">
                    <span className="text-orange-500 font-black">Q:</span> {faq.q}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 pl-5 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Category Hubs */}
        {guide.relatedHubs && guide.relatedHubs.length > 0 && (
          <div className="space-y-4 mb-12">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 pl-2">
              Explora Negocios y Servicios Relacionados
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {guide.relatedHubs.map((hub, i) => (
                <button
                  key={i}
                  onClick={() => navigate(hub.url)}
                  className="flex items-center justify-between p-4 bg-slate-900/80 hover:bg-slate-800 rounded-2xl border border-white/10 hover:border-orange-500/40 transition-all text-left group"
                >
                  <span className="text-xs font-bold text-slate-200 group-hover:text-white">
                    {hub.label}
                  </span>
                  <ArrowRight className="w-4 h-4 text-orange-400 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="text-center pt-4">
          <button
            onClick={() => navigate('/explore')}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-wider text-xs inline-flex items-center gap-2"
          >
            <Compass className="w-4 h-4" />
            <span>Ver Negocios y Eventos en el Mapa</span>
          </button>
        </div>
      </div>
    </div>
  );
};

