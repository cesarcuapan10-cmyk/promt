/**
 * Base científica que respalda el diagnóstico. Son referencias publicadas y revisadas por pares
 * o textos de referencia en antropometría. La aplicación al corte es criterio profesional
 * apoyado en estas medidas: se le dice así al cliente, sin exagerar.
 */
export type Estudio = {
  id: string
  tema: "rostro" | "craneo" | "cabello" | "barba" | "percepcion"
  titulo: string
  cita: string
  hallazgo: string
  aplicacion: string
}

export const ESTUDIOS: Estudio[] = [
  {
    id: "farkas",
    tema: "rostro",
    titulo: "Proporciones faciales de referencia",
    cita: "Farkas LG. Anthropometry of the Head and Face, 2ª ed. Raven Press, 1994.",
    hallazgo:
      "Estableció las medidas normativas de cabeza y cara (anchos, largos y tercios faciales) en miles de personas y es la base de la antropometría clínica actual.",
    aplicacion:
      "Medimos los tercios del rostro y la relación largo/ancho. Si un tercio domina, el volumen y la línea del corte se usan para equilibrarlo.",
  },
  {
    id: "pallett",
    tema: "rostro",
    titulo: "Las nuevas proporciones \"doradas\"",
    cita: "Pallett PM, Link S, Lee K. New \"golden\" ratios for facial beauty. Vision Research. 2010;50(2):149-154.",
    hallazgo:
      "El rostro se percibe más armónico cuando la distancia vertical ojos-boca es ≈36% del largo facial y la distancia entre ojos ≈46% del ancho. El estudio señala que el peinado (por ejemplo, un fleco) cambia esas proporciones percibidas.",
    aplicacion:
      "Calculamos ambas razones en la foto frontal. Si el rostro se lee largo, bajamos visualmente la frente con fleco o textura; si se lee corto, despejamos y damos altura.",
  },
  {
    id: "indice-cefalico",
    tema: "craneo",
    titulo: "Índice cefálico y forma del cráneo",
    cita: "Martin R, Saller K. Lehrbuch der Anthropologie, 3ª ed. Gustav Fischer, 1957 (clasificación del índice cefálico).",
    hallazgo:
      "Índice cefálico = ancho máximo ÷ largo máximo × 100. Dolicocéfalo < 76, mesocéfalo 76–81, braquicéfalo > 81.",
    aplicacion:
      "Un cráneo braquicéfalo con nuca plana pide volumen en coronilla y degradado más bajo atrás; uno dolicocéfalo pide menos altura arriba y más ancho lateral.",
  },
  {
    id: "mettrie",
    tema: "cabello",
    titulo: "Clasificación mundial del rizo",
    cita: "De la Mettrie R, et al. Shape variability and classification of human hair: a worldwide approach. Human Biology. 2007;79(3):265-281.",
    hallazgo:
      "Clasificó el cabello humano en 8 tipos de rizo con parámetros medibles (diámetro de la curva, índice de rizo, número de ondas y torsiones), en lugar de solo por origen étnico.",
    aplicacion:
      "El tipo de rizo define cuánto \"sube\" el cabello al secar y cuánto largo dejar arriba para que el corte se vea como en la simulación.",
  },
  {
    id: "franbourg",
    tema: "cabello",
    titulo: "Grosor y sección del cabello",
    cita: "Franbourg A, et al. Current research on ethnic hair. J Am Acad Dermatol. 2003;48(6 Suppl):S115-S119.",
    hallazgo:
      "El cabello de origen asiático y amerindio tiende a ser más grueso y de sección más redonda; el africano, elíptico y rizado; el europeo, intermedio.",
    aplicacion:
      "El cabello lacio y grueso (muy común en México) se para cuando se deja entre 1 y 3 cm. Por eso trabajamos ese rango con texturizado o lo dejamos más corto o más largo.",
  },
  {
    id: "candela",
    tema: "cabello",
    titulo: "Genética del cabello y la barba en latinoamericanos",
    cita: "Adhikari K, et al. A genome-wide association scan in admixed Latin Americans identifies loci influencing facial and scalp hair features. Nature Communications. 2016;7:10815.",
    hallazgo:
      "En más de 6,000 latinoamericanos (incluido México) identificó genes asociados a la forma del cabello, la densidad de barba, las cejas y las canas.",
    aplicacion:
      "La densidad de barba y la forma del cabello tienen un componente genético: recomendamos estilos que aprovechan lo que el cliente sí tiene en lugar de pelearse con ello.",
  },
  {
    id: "crecimiento",
    tema: "cabello",
    titulo: "Velocidad de crecimiento",
    cita: "Loussouarn G, et al. Diversity of hair growth profiles. Int J Dermatol. 2005;44(Suppl 1):6-9.",
    hallazgo:
      "El cabello crece en promedio alrededor de 1 cm al mes, con diferencias según el origen étnico de la persona.",
    aplicacion:
      "Un degradado de 1–3 mm pierde definición en 2–3 semanas. Con eso calculamos la frecuencia de mantenimiento de cada corte recomendado.",
  },
  {
    id: "norwood",
    tema: "cabello",
    titulo: "Escala de entradas y calvicie",
    cita: "Norwood OT. Male pattern baldness: classification and incidence. Southern Medical Journal. 1975;68(11):1359-1365.",
    hallazgo:
      "Clasificó la alopecia androgenética masculina en 7 grados con 1,000 hombres y mostró que su frecuencia aumenta con la edad.",
    aplicacion:
      "Si hay entradas (Norwood II–III), evitamos cortes que expongan la línea frontal y movemos el volumen hacia adelante.",
  },
  {
    id: "mannes",
    tema: "percepcion",
    titulo: "Cabeza rapada y percepción de dominancia",
    cita: "Mannes AE. Shorn scalps and perceptions of male dominance. Social Psychological and Personality Science. 2013;4(2):198-205.",
    hallazgo:
      "En tres experimentos, los hombres con la cabeza rapada fueron percibidos como más dominantes y hasta más altos que los mismos hombres con cabello.",
    aplicacion:
      "Con calvicie avanzada (Norwood V+), el rapado o buzz cut bien perfilado con barba suele proyectar más que intentar cubrir.",
  },
  {
    id: "dixson",
    tema: "barba",
    titulo: "La barba y cómo te perciben",
    cita: "Dixson BJ, Brooks RC. The role of facial hair in women's perceptions of men's attractiveness, health, masculinity and parenting abilities. Evolution and Human Behavior. 2013;34(3):236-241.",
    hallazgo:
      "La barba de pocos días (heavy stubble) fue la mejor calificada en atractivo; la barba completa, en salud, masculinidad y capacidad de crianza.",
    aplicacion:
      "Elegimos el largo de barba según la imagen que el cliente quiere proyectar, no solo por moda.",
  },
  {
    id: "janif",
    tema: "barba",
    titulo: "Lo distinto atrae más",
    cita: "Janif ZJ, Brooks RC, Dixson BJ. Negative frequency-dependent preferences and variation in male facial hair. Biology Letters. 2014;10(4):20130958.",
    hallazgo:
      "La barba resultó más atractiva cuando era poco común en el grupo, y menos cuando todos la llevaban.",
    aplicacion:
      "Proponemos un estilo que diferencie al cliente de lo que lleva todo su entorno.",
  },
]

export const AVISO_CIENTIFICO =
  "Las medidas son objetivas (malla facial de 478 puntos). La recomendación de estilo es criterio profesional apoyado en estas referencias, no un diagnóstico médico."
