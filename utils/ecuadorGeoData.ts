// Base de datos geográfica oficial y comunal del Ecuador
// Estructura 4 Niveles: PROVINCIA -> CANTÓN -> PARROQUIA -> COMUNA / LOCALIDAD

export interface LocationStructure {
    [province: string]: {
        [canton: string]: {
            [parroquia: string]: string[];
        };
    };
}

export const ECUADOR_GEO_DATA: LocationStructure = {
    'Santa Elena': {
        'Santa Elena': {
            'Manglaralto': [
                'Todas',
                'Montañita',
                'Olón',
                'Manglaralto (Cabecera)',
                'Curía',
                'Las Núñez',
                'San José',
                'La Entrada',
                'Cadeate',
                'Libertador Bolívar',
                'San Antonio',
                'Río Chico',
                'Dos Mangas',
                'Bambil Collao',
                'Pajiza',
                'El Tigrillo',
                'La Punta'
            ],
            'Colonche': [
                'Todas',
                'Palmar',
                'Monteverde',
                'Jambelí',
                'Colonche (Cabecera)',
                'Manantial de Colonche',
                'Febres Cordero',
                'Bambil Desecho',
                'Fiebre',
                'Aguadita'
            ],
            'Santa Elena (Matriz / Urbana)': [
                'Todas',
                'Ballenita',
                'Santa Elena Centro',
                'Cerro El Tablazo',
                'Mercado Central',
                'Terminal Terrestre',
                'Barrio Alberto Spencer'
            ],
            'Chanduy': [
                'Todas',
                'Puerto Chanduy',
                'Real Alto',
                'Pechiche',
                'Tugaduaja',
                'Engunga',
                'Manantial de Chanduy',
                'El Real'
            ],
            'San José de Ancón': [
                'Todas',
                'Ancón Centro',
                'Sector Petrolero Histórico',
                'Playa Acapulco',
                'El Club'
            ],
            'Atahualpa': [
                'Todas',
                'Atahualpa Centro',
                'Comuna Atahualpa',
                'Ruta de Mueblerías'
            ],
            'Simón Bolívar (Julio Moreno)': [
                'Todas',
                'Julio Moreno Centro',
                'Comuna Sacachún (Monolito San Biritute)',
                'Juntas del Pacífico',
                'Sube y Baja'
            ]
        },
        'Salinas': {
            'Salinas (Matriz / Urbana)': [
                'Todas',
                'San Lorenzo',
                'Chipipe',
                'Malecón de Salinas',
                'Mar Bravo',
                'La Chocolatera',
                'La Lobería',
                'Las Palmeras'
            ],
            'José Luis Tamayo (Muey)': [
                'Todas',
                'Muey Centro',
                'Punta Carnero Playa',
                'Barrio Centenario'
            ],
            'Anconcito': [
                'Todas',
                'Anconcito Puerto Pesquero',
                'Playa Rosada',
                'Las Peñas',
                'Barrio 5 de Junio'
            ],
            'Santa Rosa': [
                'Todas',
                'Santa Rosa Puerto Pesquero',
                'Centro',
                'El Malecón'
            ]
        },
        'La Libertad': {
            'La Libertad (Matriz / Urbana)': [
                'Todas',
                'Centro Comercial',
                'Malecón de La Libertad',
                'Paseo Shopping',
                'Barrio 28 de Mayo',
                'General Enríquez Gallo',
                '11 de Diciembre',
                '5 de Junio',
                'La Carioca',
                'Barrio 10 de Agosto'
            ]
        }
    },
    'Guayas': {
        'Guayaquil': {
            'Tarqui (Urbana)': ['Todas', 'Urdesa', 'Kennedy', 'Alborada', 'Sauces', 'Garzota', 'Guayacanes', 'Samanes', 'La FAE'],
            'Ximena / Febres Cordero (Urbana)': ['Todas', 'Centro', 'Malecón 2000', 'Puerto Santa Ana', 'Las Peñas', 'Barrio del Astillero', 'Barrio del Centenario'],
            'Chongón': ['Todas', 'Chongón Centro', 'Vía a la Costa', 'Puerto Hondo', 'Valle Alto'],
            'Posorja': ['Todas', 'Posorja Centro', 'Puerto de Aguas Profundas', 'Playa Varadero', 'Data de Posorja'],
            'Progreso (Juan Gómez Rendón)': ['Todas', 'Progreso Centro', 'Comuna San Lorenzo', 'Caimito'],
            'Puná': ['Todas', 'Puná Vieja', 'Playa Cauchiche', 'Bellavista', 'Campo Alegre'],
            'Tenguel': ['Todas', 'Tenguel Centro', 'Comuna San Rafael']
        },
        'Playas (General Villamil)': {
            'General Villamil': [
                'Todas',
                'Playa Central',
                'Malecón',
                'Centro',
                'Data de Villamil',
                'Puerto Engabao (Surf)',
                'Comuna Engabao',
                'Playa Paraíso',
                'El Pelado',
                'San Antonio'
            ]
        },
        'Samborondón': {
            'La Puntilla (Satélite)': ['Todas', 'Entre Ríos', 'La Puntilla', 'Plaza Lagos', 'Ciudad Celeste', 'Buijo Histórico', 'Isla Mocolí'],
            'Samborondón (Cabecera)': ['Todas', 'Centro', 'Malecón', 'Boca de Caña', 'Tarifa']
        },
        'Daule': {
            'La Aurora (Satélite)': ['Todas', 'Villa Club', 'La Joya', 'Matices', 'El Condado', 'Villa del Rey', 'Vía Salitre'],
            'Daule (Cabecera)': ['Todas', 'Centro', 'Malecón', 'Los Lojas', 'Las Maravillas']
        },
        'Durán': {
            'Eloy Alfaro (Durán)': ['Todas', 'Centro', 'Malecón', 'Primavera 1 y 2', 'El Recreo', 'Abel Gilbert', 'Panorama']
        },
        'Milagro': {
            'Milagro (Urbana)': ['Todas', 'Centro', 'Las Piñas', 'Los Chirijos', 'Chobo', 'Mariscal Sucre']
        },
        'Bucay': {
            'General Antonio Elizalde (Bucay)': ['Todas', 'Centro', 'Ruta de las Cascadas', 'Bosque Húmedo', 'Río Chimbo']
        },
        'Naranjal': {
            'Naranjal': ['Todas', 'Centro', 'Comuna Shuar', 'Aguas Termales', 'Puerto Inca']
        },
        'Salitre': {
            'Salitre (Urbana)': ['Todas', 'Playa Santa Marianita', 'Centro', 'Vernaza', 'General Vernaza', 'La Victoria']
        },
        'Balzar': { 'Balzar': ['Todas', 'Centro', 'San Jacinto'] },
        'Colimes': { 'Colimes': ['Todas', 'Centro', 'San Jacinto de Colimes'] },
        'El Empalme': { 'Velasco Ibarra (El Empalme)': ['Todas', 'Centro', 'El Rosario', 'Guayas'] },
        'El Triunfo': { 'El Triunfo': ['Todas', 'Centro'] },
        'Isidro Ayora': { 'Isidro Ayora': ['Todas', 'Centro'] },
        'Lomas de Sargentillo': { 'Lomas de Sargentillo': ['Todas', 'Centro'] },
        'Marcelino Maridueña': { 'Coronel Marcelino Maridueña': ['Todas', 'Centro'] },
        'Naranjito': { 'Naranjito': ['Todas', 'Centro'] },
        'Nobol': { 'Narcisa de Jesús (Nobol)': ['Todas', 'Centro', 'Santuario Nacional Narcisa de Jesús'] },
        'Palestina': { 'Palestina': ['Todas', 'Centro'] },
        'Pedro Carbo': { 'Pedro Carbo': ['Todas', 'Centro', 'Valle de la Virgen', 'Sabanilla'] },
        'Santa Lucía': { 'Santa Lucía': ['Todas', 'Centro'] },
        'Simón Bolívar': { 'Simón Bolívar': ['Todas', 'Centro', 'Lorenzo de Garaicoa'] },
        'Yaguachi': { 'San Jacinto de Yaguachi': ['Todas', 'Centro', 'Catedral de San Jacinto', 'Yaguachi Viejo'] }
    },
    'Manabí': {
        'Puerto López': {
            'Puerto López (Cabecera)': [
                'Todas',
                'Malecón de Puerto López',
                'Centro',
                'Punta Baja',
                'Ayampe (Surf & Selva)',
                'Las Tunas',
                'Puerto Rico',
                'Río Chico',
                'Salango',
                'Isla Salango'
            ],
            'Machalilla': [
                'Todas',
                'Playa Los Frailes',
                'Comuna Machalilla',
                'Comuna Agua Blanca (Museo & Laguna de Azufre)',
                'Playa Tortuguita'
            ]
        },
        'Manta': {
            'Manta (Urbana)': ['Todas', 'El Murciélago', 'Tarqui', 'Los Esteros', 'Barbasquillo', 'La Poza'],
            'San Mateo': ['Todas', 'Puerto Pesquero', 'Playa San Mateo'],
            'Santa Marianita': ['Todas', 'Playa de Kitesurf', 'Comuna Santa Marianita', 'Punta Bikini'],
            'San Lorenzo': ['Todas', 'Playa San Lorenzo', 'El Faro', 'Liguiqui (Corrales Marinos)']
        },
        'Portoviejo': {
            'Portoviejo (Urbana)': ['Todas', 'Centro Histórico', 'Parque La Rotonda', 'Las Vegas', 'San Alejo'],
            'Crucita': ['Todas', 'La Loma (Parapente)', 'Malecón de Crucita', 'Los Arenales', 'Las Gilces (Manglar)']
        },
        'Pedernales': {
            'Pedernales (Cabecera)': ['Todas', 'Playa Central', 'Malecón', 'Punta Palmar'],
            'Cojimíes': ['Todas', 'Playa Cojimíes', 'Isla del Amor', 'Comuna Cojimíes']
        },
        'Sucre (Bahía de Caráquez)': {
            'Bahía de Caráquez': ['Todas', 'Punta Bellaca', 'Malecón', 'Centro', 'Paseo Fluvial'],
            'Canoa': ['Todas', 'Playa Canoa', 'Centro', 'Punta Canoa', 'Comuna Canoa']
        },
        'San Vicente': {
            'San Vicente': ['Todas', 'Centro', 'Playa Briceño', 'Punta Napo', 'Canoa Sur']
        },
        'Montecristi': {
            'Montecristi': ['Todas', 'Ciudad Alfaro', 'Centro Artesanal del Sombrero de Paja Toquilla', 'La Pila']
        },
        'Jipijapa': {
            'Jipijapa (Cabecera)': ['Todas', 'Centro', 'Pozas de Agua Azufrada'],
            'Puerto Cayo': ['Todas', 'Playa Puerto Cayo', 'Malecón', 'Punta Puerto Cayo']
        },
        'Chone': { 'Chone': ['Todas', 'Centro', 'Humedal La Segua', 'Canuto', 'San Antonio'] },
        'El Carmen': { 'El Carmen': ['Todas', 'Centro', 'La 40', 'San Pedro de Suma'] },
        'Jama': { 'Jama': ['Todas', 'El Matal Playa', 'Punta Prieta', 'Tetas de Jama', 'Tasaste'] },
        'Bolívar (Calceta)': { 'Calceta': ['Todas', 'Centro', 'Represa La Esperanza', 'Quiroga'] },
        'Tosagua': { 'Tosagua': ['Todas', 'Centro', 'Bachillero'] },
        'Rocafuerte': { 'Rocafuerte': ['Todas', 'Centro', 'Ruta de los Dulces Tradicionales'] },
        'Paján': { 'Paján': ['Todas', 'Centro', 'Campozano', 'Cascadas de Procel'] },
        'Santa Ana': { 'Santa Ana': ['Todas', 'Centro', 'Poza Honda', 'Ayacucho'] },
        'Junín': { 'Junín': ['Todas', 'Centro'] },
        'Flavio Alfaro': { 'Flavio Alfaro': ['Todas', 'Centro', 'San Francisco de Novillo'] },
        'Jaramijó': { 'Jaramijó': ['Todas', 'Playa Fondeadero', 'Centro', 'Puerto'] },
        'Olmedo': { 'Olmedo': ['Todas', 'Centro'] },
        'Pichincha': { 'Pichincha': ['Todas', 'Centro', 'Presa Daule-Peripa'] },
        '24 de Mayo': { 'Sucre (24 de Mayo)': ['Todas', 'Bellavista', 'Noboa', 'Sixto Durán Ballén'] }
    },
    'Pichincha': {
        'Quito': {
            'Centro Histórico': ['Todas', 'Plaza Grande', 'La Ronda', 'San Francisco', 'El Panecillo', 'San Blas'],
            'La Mariscal / Iñaquito': ['Todas', 'Plaza Foch', 'La Carolina', 'González Suárez', 'La Floresta', 'Guápulo', 'Bellavista', 'El Batán'],
            'Cumbayá': ['Todas', 'Plaza Cumbayá', 'San Juan', 'Lumbisí', 'La Primavera', 'Miravalle'],
            'Tumbaco': ['Todas', 'Tumbaco Centro', 'La Cerámica', 'Ruta Viva', 'Arrayanes', 'Chiviquí'],
            'Valle de Los Chillos (Conocoto / San Rafael)': ['Todas', 'San Rafael', 'El Triángulo', 'Conocoto', 'Capelo', 'Amaguaña', 'Alangasí', 'La Armenia'],
            'Calderón / Carapungo': ['Todas', 'Calderón Centro', 'Carapungo', 'Zabala', 'San Juan de Calderón'],
            'San Antonio de Pichincha (Mitad del Mundo)': ['Todas', 'Ciudad Mitad del Mundo', 'Calacalí', 'Pomasqui', 'Casitagua'],
            'Píntag': ['Todas', 'Píntag Centro', 'Laguna La Mica', 'Antisana Eco-Reserva'],
            'Nayón': ['Todas', 'Nayón Centro', 'Viveros y Jardines', 'Tacuña']
        },
        'Rumiñahui (Sangolquí)': {
            'Sangolquí': ['Todas', 'Centro Histórico', 'Monumento Rumiñahui', 'Cashapamba', 'Cotogchoa', 'San Pedro de Taboada']
        },
        'Cayambe': {
            'Cayambe': ['Todas', 'Centro', 'Cangahua', 'Olmedo', 'Ruta de los Bizcochos', 'Hacienda Guachalá']
        },
        'Mejía (Machachi)': {
            'Machachi': ['Todas', 'Centro', 'El Chaupi (Illinizas)', 'Aloag', 'Tandapi', 'Pasochoa']
        },
        'Pedro Moncayo (Tabacundo)': {
            'Tabacundo': ['Todas', 'Centro', 'Lagunas de Mojanda', 'La Esperanza', 'Tupigachi']
        },
        'San Miguel de los Bancos': {
            'Mindo': ['Todas', 'Mindo Centro', 'Reserva Mindo Nambillo', 'Santuario de Cascadas', 'Mariposario', 'Tarabita'],
            'San Miguel de los Bancos (Cabecera)': ['Todas', 'Centro']
        },
        'Pedro Vicente Maldonado': { 'Pedro Vicente Maldonado': ['Todas', 'Centro', 'Cascadas del Río Blanco'] },
        'Puerto Quito': { 'Puerto Quito': ['Todas', 'Centro', 'Cascada Azul', 'Río Caoni'] }
    },
    'Azuay': {
        'Cuenca': {
            'Cuenca (Urbana)': ['Todas', 'Centro Histórico', 'El Vado', 'El Barranco', 'Totoracocha', 'Huayna Cápac', 'Mirador de Turi', 'Yanuncay', 'Monay'],
            'Baños (Aguas Termales)': ['Todas', 'Balnearios Termales', 'Centro de Baños', 'Hosterías'],
            'Sayausí (Parque Cajas)': ['Todas', 'Entrada Parque Nacional Cajas', 'Centro', 'San Joaquín'],
            'Ricaurte': ['Todas', 'Centro', 'Zona Gastronómica (Cuyes)']
        },
        'Gualaceo': { 'Gualaceo': ['Todas', 'Centro', 'Riberas del Río Santa Bárbara', 'Artesanías (Makanas)', 'San Juan'] },
        'Chordeleg': { 'Chordeleg': ['Todas', 'Centro Joyero de Filigrana', 'Plaza Central', 'La Unión'] },
        'Paute': { 'Paute': ['Todas', 'Centro', 'Malecón del Río', 'Chicticay', 'Bulán'] },
        'Santa Isabel': { 'Santa Isabel': ['Todas', 'Valle de Yunguilla', 'Centro', 'Abdón Calderón'] },
        'Camilo Ponce Enríquez': { 'Camilo Ponce Enríquez': ['Todas', 'Centro', 'Bella Rica'] },
        'Girón': { 'Girón': ['Todas', 'Cascada El Chorro', 'Centro'] },
        'Nabón': { 'Nabón': ['Todas', 'Centro', 'Cochapata'] },
        'San Fernando': { 'San Fernando': ['Todas', 'Laguna de Busa', 'Centro'] },
        'Sígsig': { 'Sígsig': ['Todas', 'Centro', 'Chobshi', 'San Bartolomé (Guitarras)'] },
        'El Pan': { 'El Pan': ['Todas', 'Centro'] },
        'Guachapala': { 'Guachapala': ['Todas', 'Santuario del Señor de Andacocha'] },
        'Oña': { 'San Felipe de Oña': ['Todas', 'Centro Histórico'] },
        'Pucará': { 'Pucará': ['Todas', 'Centro'] },
        'Sevilla de Oro': { 'Sevilla de Oro': ['Todas', 'Centro', 'Represa Mazar'] }
    },
    'El Oro': {
        'Machala': { 'Machala (Urbana)': ['Todas', 'Centro', 'Puerto Bolívar (Gastronomía)', 'El Cambio', 'Jambelí'] },
        'Santa Rosa': { 'Santa Rosa': ['Todas', 'Centro', 'Puerto Jelí (Cuna del Encocado)', 'Archipiélago de Jambelí', 'Bellamaría'] },
        'Pasaje': { 'Pasaje': ['Todas', 'Centro', 'Buenavista', 'Casacay (Balneario Laguna Azul)'] },
        'Huaquillas': { 'Huaquillas': ['Todas', 'Centro Comercial', 'Puente Internacional Frontera', 'Puerto Hualtaco'] },
        'Arenillas': { 'Arenillas': ['Todas', 'Centro', 'Represa Tahuín', 'Reserva Ecológica Arenillas', 'Chacras'] },
        'Zaruma': { 'Zaruma': ['Todas', 'Centro Histórico Patrimonio', 'Mina El Sexmo', 'Cerro de Arcos', 'Malvas'] },
        'Piñas': { 'Piñas': ['Todas', 'Centro', 'Orquideario', 'Capiro', 'Moromoro'] },
        'Portovelo': { 'Portovelo': ['Todas', 'Centro', 'Museo Mineralógico', 'Salatí'] },
        'El Guabo': { 'El Guabo': ['Todas', 'Centro', 'Playa Bajo Alto', 'Tendales', 'Barbones'] },
        'Atahualpa': { 'Paccha': ['Todas', 'Centro', 'Ayapamba', 'Cordoncillo'] },
        'Balsas': { 'Balsas': ['Todas', 'Centro', 'Bellamaría'] },
        'Chilla': { 'Chilla': ['Todas', 'Centro', 'Santuario Virgen de Chilla'] },
        'Las Lajas': { 'La Victoria': ['Todas', 'Centro', 'Bosque Petrificado Puyango', 'Platanillos'] },
        'Marcabelí': { 'Marcabelí': ['Todas', 'Centro', 'El Ingenio'] }
    },
    'Esmeraldas': {
        'Esmeraldas': { 'Esmeraldas (Urbana)': ['Todas', 'Playa Las Palmas', 'Centro', 'Tachina', 'Camarones', 'Vuelta Larga'] },
        'Atacames': {
            'Atacames': ['Todas', 'Playa Atacames', 'Malecón Turístico', 'Boca de Atacames'],
            'Tonsupa': ['Todas', 'Playa Tonsupa', 'Sector Edificios y Hoteles', 'Castelnovo'],
            'Súa': ['Todas', 'Playa Súa', 'Peñón del Suicida', 'Poblado'],
            'Same': ['Todas', 'Playa Same', 'Club Casablanca', 'Punta Same'],
            'Tonchigüe': ['Todas', 'Playa Tonchigüe', 'Puerto Pesquero']
        },
        'Muisne': {
            'Muisne': ['Todas', 'Isla de Muisne', 'Playa Muisne'],
            'Galera / San Francisco': ['Todas', 'Playa Escondida', 'Cabo San Francisco', 'Playa Estero de Plátano']
        },
        'Quinindé': { 'Rosa Zárate (Quinindé)': ['Todas', 'Centro', 'La Unión', 'Cube', 'Viche'] },
        'Rioverde': { 'Rioverde': ['Todas', 'Centro', 'Playa Las Peñas', 'Rocafuerte', 'Chontaduro'] },
        'San Lorenzo': { 'San Lorenzo': ['Todas', 'Centro', 'Manglares Majagual', 'Mataje'] },
        'Eloy Alfaro': { 'Valdez (Limones)': ['Todas', 'Limones', 'Borbón', 'Anchayacu', 'La Tola'] }
    },
    'Galápagos': {
        'Santa Cruz': {
            'Puerto Ayora': ['Todas', 'Malecón', 'Bahía Academy', 'Estación Charles Darwin', 'Tortuga Bay', 'Las Grietas', 'Playa de los Alemanes', 'Punta Estrada'],
            'Bellavista': ['Todas', 'Centro', 'Los Gemelos', 'Túneles de Lava'],
            'Santa Rosa': ['Todas', 'Centro', 'Reserva de Tortugas Gigantes El Chato']
        },
        'San Cristóbal': {
            'Puerto Baquerizo Moreno': ['Todas', 'Malecón', 'Playa Mann', 'Punta Carola', 'Cerro Tijeretas', 'La Lobería', 'Puerto Chino'],
            'El Progreso': ['Todas', 'Centro', 'Laguna El Junco', 'Cerro Brujo']
        },
        'Isabela': {
            'Puerto Villamil': ['Todas', 'Playa Principal', 'Concha de Perla', 'Los Túneles', 'Volcán Sierra Negra', 'Tintoreras']
        }
    },
    'Tungurahua': {
        'Ambato': { 'Ambato (Urbana)': ['Todas', 'Centro', 'Ficoa', 'Miraflores', 'Atocha', 'Huachi Chico', 'Izamba', 'Pinllo (Pan y Gallinas)'] },
        'Baños de Agua Santa': {
            'Baños': ['Todas', 'Centro', 'Termas de la Virgen', 'Ruta de las Cascadas', 'Pailón del Diablo', 'Casa del Árbol', 'Runtún', 'Río Verde']
        },
        'Pelileo': { 'Pelileo': ['Todas', 'Centro de Jeans', 'Comunidad Salasaca', 'Huambaló (Muebles)'] },
        'Píllaro': { 'Píllaro': ['Todas', 'Centro', 'Ruta de la Diablada', 'Parque Nacional Llanganates', 'San Andrés'] },
        'Cevallos': { 'Cevallos': ['Todas', 'Centro del Calzado', 'Huertos Frutales'] },
        'Mocha': { 'Mocha': ['Todas', 'Centro', 'Pinguilí'] },
        'Patate': { 'Patate': ['Todas', 'Pueblo Mágico', 'Centro', 'Los Andes', 'Sucre'] },
        'Quero': { 'Santiago de Quero': ['Todas', 'Centro', 'Rumipamba'] },
        'Tisaleo': { 'Tisaleo': ['Todas', 'Centro', 'Alobamba'] }
    },
    'Imbabura': {
        'Ibarra': { 'Ibarra (Urbana)': ['Todas', 'Centro Histórico', 'Laguna de Yahuarcocha', 'San Antonio de Ibarra (Tallados en Madera)', 'Ambuquí', 'La Esperanza'] },
        'Otavalo': { 'Otavalo': ['Todas', 'Plaza de Ponchos', 'Laguna de San Pablo', 'Cascada de Peguche', 'Quichinche', 'Ilumán', 'González Suárez'] },
        'Cotacachi': { 'Cotacachi': ['Todas', 'Centro del Cuero', 'Laguna de Cuicocha', 'Quiroga', 'Valle de Íntag (Café y Termas)'] },
        'Antonio Ante (Atuntaqui)': { 'Atuntaqui': ['Todas', 'Centro Textil', 'Andrade Marín', 'Natabuela', 'San Roque'] },
        'Pimampiro': { 'Pimampiro': ['Todas', 'Pueblo Mágico', 'Centro', 'Chugá', 'Mariano Acosta'] },
        'Urcuquí': { 'Urcuquí': ['Todas', 'Yachay Tech', 'Termas de Chachimbiro', 'Tumbabiro'] }
    },
    'Loja': {
        'Loja': { 'Loja (Urbana)': ['Todas', 'Centro Histórico', 'El Valle', 'San Sebastián', 'Vilcabamba (Valle de la Longevidad)', 'Malacatos', 'Yangana', 'Chantaco'] },
        'Catamayo': { 'Catamayo': ['Todas', 'Centro', 'Aeropuerto', 'El Guayabal', 'San Pedro de la Bendita'] },
        'Calvas (Cariamanga)': { 'Cariamanga': ['Todas', 'Centro', 'Cerro Ahuaca', 'Colaisaca'] },
        'Macará': { 'Macará': ['Todas', 'Centro', 'Puente Internacional Frontera', 'La Victoria', 'Sabiango'] },
        'Paltas (Catacocha)': { 'Catacocha': ['Todas', 'Pueblo Mágico', 'El Mirador Shiriculapo', 'Cangonamá'] },
        'Puyango (Alamor)': { 'Alamor': ['Todas', 'Centro', 'Bosque Petrificado Puyango', 'Mercadillo'] },
        'Saraguro': { 'Saraguro': ['Todas', 'Comunidad Indígena Saraguro', 'Centro', 'San Lucas', 'Tenta'] },
        'Zapotillo': { 'Zapotillo': ['Todas', 'Florecimiento de Guayacanes', 'Mangahurco', 'Cazaderos', 'Bolaspamba'] },
        'Celica': { 'Celica': ['Todas', 'Centro', 'Pozul'] },
        'Chaguarpamba': { 'Chaguarpamba': ['Todas', 'Centro', 'Buenavista'] },
        'Espíndola': { 'Amaluza': ['Todas', 'Lagunas Negras de Jimbura', 'Centro'] },
        'Gonzanamá': { 'Gonzanamá': ['Todas', 'Centro', 'Changaimina'] },
        'Olmedo': { 'Olmedo': ['Todas', 'Centro', 'La Tingue'] },
        'Pindal': { 'Pindal': ['Todas', 'Centro', 'Piscinas Naturales'] },
        'Quilanga': { 'Quilanga': ['Todas', 'Centro (Café de Altura)'] },
        'Sozoranga': { 'Sozoranga': ['Todas', 'Centro', 'Nueva Fátima'] }
    },
    'Los Ríos': {
        'Babahoyo': { 'Babahoyo (Urbana)': ['Todas', 'Centro', 'Malecón 9 de Octubre', 'Casa de Olmedo', 'Barreiro', 'Caracol', 'Febres Cordero'] },
        'Quevedo': { 'Quevedo (Urbana)': ['Todas', 'Centro Comercial', 'San Camilo', '7 de Octubre', 'El Guayacán', 'Viva Alfaro'] },
        'Vinces': { 'Vinces (París Chiquito)': ['Todas', 'Malecón del Río', 'Playa de Río', 'Centro', 'Antonio Sotomayor', 'Húmedal Abras de Mantequilla'] },
        'Ventanas': { 'Ventanas': ['Todas', 'Centro', '10 de Noviembre', 'Zapotal', 'Chacarita'] },
        'Buena Fe': { 'San Jacinto de Buena Fe': ['Todas', 'Centro', 'Patricia Pilar'] },
        'Valencia': { 'Valencia': ['Todas', 'Centro', 'La Unión'] },
        'Montalvo': { 'Montalvo': ['Todas', 'Centro', 'Ríos y Balnearios de Agua Dulce', 'La Esmeralda'] },
        'Mocache': { 'Mocache': ['Todas', 'Centro'] },
        'Baba': { 'Baba': ['Todas', 'Centro', 'Guare', 'Isla de Bejucal'] },
        'Palenque': { 'Palenque': ['Todas', 'Centro'] },
        'Puebloviejo': { 'Puebloviejo': ['Todas', 'Centro', 'San Juan', 'Puerto Pechiche'] },
        'Quinsaloma': { 'Quinsaloma': ['Todas', 'Centro'] },
        'Urdaneta (Catarama)': { 'Catarama': ['Todas', 'Ricaurte'] }
    },
    'Chimborazo': {
        'Riobamba': { 'Riobamba (Urbana)': ['Todas', 'Centro Histórico', 'Bellavista', 'Parque Maldonado', 'Yaruquíes', 'San Juan (Nevado Chimborazo)'] },
        'Alausí': { 'Alausí': ['Todas', 'Estación Nariz del Diablo', 'Centro Histórico', 'Huigra', 'Sibambe', 'Achupallas (Camino del Inca)'] },
        'Guano': { 'Guano': ['Todas', 'Centro Artesanal de Alfombras', 'Museo de la Momia', 'San Andrés', 'Ilapo'] },
        'Colta': { 'Villa La Unión (Colta)': ['Todas', 'Laguna de Colta', 'Iglesia de Balbanera (Primera del Ecuador)', 'Cañi'] },
        'Chambo': { 'Chambo': ['Todas', 'Centro', 'Aguas Termales de Guayllabamba'] },
        'Chunchi': { 'Chunchi': ['Todas', 'Centro', 'Puñay (Pirámide)'] },
        'Cumandá': { 'Cumandá': ['Todas', 'Centro'] },
        'Guamote': { 'Guamote': ['Todas', 'Mercado Indígena Tradicional', 'Cebadas'] },
        'Pallatanga': { 'Pallatanga': ['Todas', 'Centro', 'Valle de las Cascadas'] },
        'Penipe': { 'Penipe': ['Todas', 'Centro', 'Mirador Volcán Tungurahua', 'Bayushig'] }
    },
    'Cotopaxi': {
        'Latacunga': { 'Latacunga (Urbana)': ['Todas', 'Centro Histórico', 'San Felipe', 'La Laguna', 'Parque Nacional Cotopaxi', 'Joseguango Alto'] },
        'Pujilí': { 'Pujilí': ['Todas', 'Centro', 'Laguna del Quilotoa', 'Comuna Zumbahua', 'Comuna Tigua (Pinturas Tradicionales)', 'Angamarca'] },
        'Salcedo': { 'Salcedo': ['Todas', 'Centro de Helados Tradicionales', 'Laguna de Yambo', 'Mulliquindil', 'Cusubamba'] },
        'La Maná': { 'La Maná': ['Todas', 'Centro', 'Siete Cascadas', 'Pucayacu', 'Guasaganda'] },
        'Saquisilí': { 'Saquisilí': ['Todas', 'Plazas y Mercados Autóctonos', 'Canchagua'] },
        'Pangua (El Corazón)': { 'El Corazón': ['Todas', 'Centro', 'Moraspungo', 'Pinllopata'] },
        'Sigchos': { 'Sigchos': ['Todas', 'Chugchilán', 'Isinlivi (Ruta Quilotoa Loop)', 'Las Pampas'] }
    },
    'Carchi': {
        'Tulcán': { 'Tulcán (Urbana)': ['Todas', 'Cementerio Municipal José María Azaél Franco (Esculturas)', 'Centro', 'Puente Internacional Rumichaca', 'Tufiño (Termas)'] },
        'Montúfar (San Gabriel)': { 'San Gabriel': ['Todas', 'Pueblo Mágico', 'Bosque de los Arrayanes', 'Cascada de Paluz', 'La Paz (Gruta)'] },
        'Espejo (El Ángel)': { 'El Ángel': ['Todas', 'Reserva Ecológica El Ángel (Frailejones)', 'La Libertad', 'San Isidro'] },
        'Mira': { 'Mira': ['Todas', 'Balcón de los Andes', 'Juan Montalvo', 'La Concepción'] },
        'Bolívar': { 'Bolívar': ['Todas', 'Centro', 'García Moreno', 'Los Andes'] },
        'San Pedro de Huaca': { 'Huaca': ['Todas', 'Santuario Virgen de la Purita', 'Mariscal Sucre'] }
    },
    'Bolívar': {
        'Guaranda': { 'Guaranda (Urbana)': ['Todas', 'Centro Histórico', 'Las Colinas', 'Salinas de Guaranda (Quesos y Chocolates)', 'Simiatug', 'Facundo Vela'] },
        'Chimbo': { 'San José de Chimbo': ['Todas', 'Santuario del Guayco', 'Centro', 'La Asunción', 'Magdalena'] },
        'San Miguel': { 'San Miguel': ['Todas', 'Centro', 'Balsapamba', 'Bilován'] },
        'Caluma': { 'Caluma': ['Todas', 'Centro (Tierra de Cítricos)', 'Cascadas de Caluma'] },
        'Chillanes': { 'Chillanes': ['Todas', 'Centro', 'San José del Tambo'] },
        'Echeandía': { 'Echeandía': ['Todas', 'Centro', 'Balnearios'] },
        'Las Naves': { 'Las Naves': ['Todas', 'Centro', 'Las Mercaderes'] }
    },
    'Cañar': {
        'Azogues': { 'Azogues (Urbana)': ['Todas', 'Centro Histórico', 'Santuario de la Virgen de la Nube', 'Cojitambo (Escalada y Arqueología)', 'Guapán'] },
        'Cañar': { 'Cañar': ['Todas', 'Complejo Arqueológico Ingapirca', 'Centro', 'Honorato Vásquez', 'Zhud'] },
        'La Troncal': { 'La Troncal': ['Todas', 'Centro', 'Balnearios y Aguas Termales', 'Manuel de J. Calle', 'Pancho Negro'] },
        'Biblián': { 'Biblián': ['Todas', 'Santuario de la Virgen del Rocío', 'Turupamba', 'Nazón'] },
        'Déleg': { 'Déleg': ['Todas', 'Centro'] },
        'El Tambo': { 'El Tambo': ['Todas', 'Complejo Arqueológico Coyoctor', 'Centro'] },
        'Suscal': { 'Suscal': ['Todas', 'Centro'] }
    },
    'Santo Domingo de los Tsáchilas': {
        'Santo Domingo': {
            'Santo Domingo (Urbana)': ['Todas', 'Centro Comercial', 'Parque Zaracay', 'Los Rosales', 'Bombolí'],
            'Comunas Tsáchilas': ['Todas', 'Comuna Chigüilpe', 'Comuna Poste', 'Comuna Peripa', 'Comuna Los Naranjos', 'Comuna El Búa', 'Comuna Otongo Mapalí', 'Comuna Cóngoma'],
            'Parroquias Rurales': ['Todas', 'Alluriquín (Tierra de la Melcocha)', 'Valle Hermoso', 'Puerto Limón', 'Luz de América', 'San Jacinto del Búa', 'El Esfuerzo', 'Santa María del Toachi']
        },
        'La Concordia': { 'La Concordia': ['Todas', 'Centro', 'La Villegas', 'Monterrey', 'Plan Piloto'] }
    },
    'Pastaza': {
        'Pastaza (Puyo)': {
            'Puyo (Urbana)': ['Todas', 'Paseo Turístico del Río Puyo', 'Centro', 'Barrio Obrero', 'Malecón Boayaku Puyo'],
            'Parroquias y Comunidades': ['Todas', 'Misahuallí Amazónico', 'Fátima (Zoocriadero)', 'Tarqui', 'Veracruz', 'Canelos', 'Shell', 'Madre Tierra', 'Curaray']
        },
        'Mera': { 'Mera': ['Todas', 'Shell Mera', 'Mera Centro', 'Madre Tierra (Cascadas)'] },
        'Santa Clara': { 'Santa Clara': ['Todas', 'Centro', 'San José'] },
        'Arajuno': { 'Arajuno': ['Todas', 'Centro', 'Comunidades Waorani y Kichwa'] }
    },
    'Napo': {
        'Tena': {
            'Tena (Urbana)': ['Todas', 'Malecón Escénico', 'Centro', 'Parque Amazónico La Isla'],
            'Misahuallí': ['Todas', 'Puerto Misahuallí (Playa de Monos)', 'Comuna Shiripuno', 'Río Napo'],
            'Ahuano': ['Todas', 'Comuna Ahuano', 'Islas del Río Napo'],
            'Puerto Napo / Talag': ['Todas', 'Laguna Azul (Talag)', 'Puerto Napo']
        },
        'Archidona': { 'Archidona': ['Todas', 'Cavernas de Jumandy', 'Centro', 'Cotundo (Petroglifos)', 'San Pablo de Ushpayacu'] },
        'Quijos (Baeza)': { 'Baeza': ['Todas', 'Baeza Antigua (Patrimonio)', 'Cosanga (Observación de Aves)', 'Papallacta (Termas de Agua Caliente)'] },
        'El Chaco': { 'El Chaco': ['Todas', 'Cascada San Rafael', 'Centro', 'Gonzalo Díaz de Pineda'] },
        'Carlos Julio Arosemena Tola': { 'Arosemena Tola': ['Todas', 'Centro'] }
    },
    'Morona Santiago': {
        'Morona (Macas)': { 'Macas': ['Todas', 'Centro', 'Mirador del Quilamo', 'Sevilla Don Bosco', 'Cuchaentza', 'General Proaño'] },
        'Gualaquiza': { 'Gualaquiza': ['Todas', 'Centro', 'El Ideal', 'Chigüinda'] },
        'Limón Indanza': { 'General Leónidas Plaza': ['Todas', 'Centro', 'Cascadas de Chiviaza'] },
        'Palora': { 'Palora': ['Todas', 'Tierra de la Pitahaya', 'Centro', 'Arapicos'] },
        'Santiago': { 'Santiago de Méndez': ['Todas', 'Centro', 'Entrada Cueva de los Tayos', 'Patuca'] },
        'Sucúa': { 'Sucúa': ['Todas', 'Paraíso de la Amazonía', 'Centro', 'Asunción', 'Huambi'] },
        'Huamboya': { 'Huamboya': ['Todas', 'Centro', 'Chiguaza'] },
        'San Juan Bosco': { 'San Juan Bosco': ['Todas', 'Centro', 'Pan de Azúcar'] },
        'Taisha': { 'Taisha': ['Todas', 'Centro', 'Comunidades Achuar y Shuar'] },
        'Logroño': { 'Logroño': ['Todas', 'Centro', 'Yaupi'] },
        'Pablo Sexto': { 'Pablo Sexto': ['Todas', 'Centro'] },
        'Tiwintza': { 'Santiago': ['Todas', 'Centro'] }
    },
    'Orellana': {
        'Francisco de Orellana (El Coca)': { 'El Coca': ['Todas', 'Malecón del Río Napo', 'Centro', 'Parque Nacional Yasuní', 'Alejandro Labaka', 'Dayuma'] },
        'La Joya de los Sachas': { 'La Joya de los Sachas': ['Todas', 'Centro', 'Lago San Pedro', 'San Carlos', 'Enokanqui'] },
        'Loreto': { 'Loreto': ['Todas', 'Centro', 'Cascada Carachupa', 'Ávila', 'San José de Payamino'] },
        'Aguarico': { 'Nuevo Rocafuerte': ['Todas', 'Tiputini', 'Yasuní Biosfera', 'Capitán Augusto Rivadeneyra'] }
    },
    'Sucumbíos': {
        'Lago Agrio (Nueva Loja)': { 'Nueva Loja': ['Todas', 'Centro', 'Parque Ecológico Recreativo Perla', 'General Farfán (Frontera)', 'Dureno (Comuna Cofán)', 'Santa Cecilia'] },
        'Shushufindi': { 'Shushufindi': ['Todas', 'Laguna de Limoncocha', 'Centro', 'San Roque', 'Pañacocha'] },
        'Cuyabeno': { 'Tarapoa': ['Todas', 'Reserva de Producción Faunística Cuyabeno', 'Laguna Grande', 'Aguas Negras', 'Playas de Cuyabeno'] },
        'Cáscales': { 'El Dorado de Cáscales': ['Todas', 'Centro', 'Sevilla', 'Santa Rosa'] },
        'Gonzalo Pizarro': { 'Lumbaquí': ['Todas', 'Centro', 'El Reventador', 'Puerto Libre'] },
        'Putumayo': { 'Puerto El Carmen': ['Todas', 'Centro', 'Palma Roja', 'Puerto Bolívar'] },
        'Sucumbíos': { 'La Bonita': ['Todas', 'Centro', 'El Playón de San Francisco'] }
    },
    'Zamora Chinchipe': {
        'Zamora': { 'Zamora (Urbana)': ['Todas', 'Reloj Gigante', 'Malecón de Zamora', 'Parque Nacional Podocarpus', 'Timbara', 'Cumbaratza', 'Guadalupe'] },
        'Yantzaza': { 'Yantzaza': ['Todas', 'Valle de las Luciérnagas', 'Centro', 'Los Encuentros', 'Chicaña'] },
        'Centinela del Cóndor': { 'Zumbi': ['Todas', 'Centro', 'Panguintza'] },
        'Chinchipe': { 'Zumba': ['Todas', 'Centro', 'Frontera La Balsa', 'Chito', 'El Chorro'] },
        'El Pangui': { 'El Pangui': ['Todas', 'Centro', 'Tundayme', 'El Guismi'] },
        'Nangaritza': { 'Guayzimi': ['Todas', 'Laberintos de Mil Palmeras', 'Cueva de los Tayos de Nangaritza', 'Zurmi'] },
        'Palanda': { 'Palanda': ['Todas', 'Centro (Cuna Mundial del Cacao Arqueológico)', 'Valladolid'] },
        'Paquisha': { 'Paquisha': ['Todas', 'Centro', 'Bellavista', 'Nuevo Quito'] },
        'Yacuambi': { '28 de Mayo': ['Todas', 'Centro', 'La Paz', 'Tutupali'] }
    }
};
