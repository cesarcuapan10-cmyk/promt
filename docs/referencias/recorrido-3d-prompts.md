# Referencia: carrusel "Recorrido 3D de una propiedad con IA"

Fuente: carrusel de @joacoquiroogaa (slides 03–07 de 09), compartido por César para usarlo en una tarea posterior.
Estilo visual: fondo crema (#F1ECE4 aprox.), acento terracota (#B5532F aprox.), títulos serif con itálica en terracota, prompts en monoespaciada dentro de tarjeta con borde superior terracota, número grande del paso a la izquierda del título, "copiar y pegar" como etiqueta del prompt, contador "NN — 09" arriba a la derecha.

## Paso 01 · Leer el plano — *Primero las medidas. Nada de 3D.*

> Te paso el plano de **[PROPIEDAD]** (foto o PDF). Antes de construir nada, leelo y devolveme: los ambientes con ancho y largo en metros, los muros con su espesor, y cada puerta y ventana con su muro, su ancho y hacia dónde abre. Sacá la escala de la cota más larga que se lea y controlala con otra: si difieren más de **[3]** %, avisame. Lo que no se lea, no lo inventes: listalo como pregunta. Guardá todo en plano.json, en metros, con el origen en una esquina, y esperá mi OK antes de seguir.

Ilustración: plano 9,00 × 7,00 m — Cocina 2,80×2,60 · Baño 2,40×2,60 · Dormitorio 1 3,80×3,60 · Dormitorio 2 3,80×3,40 · Living-comedor 5,20×4,40 · Balcón 5,20×1,40.

## Paso 02 · Levantar el recorrido — *Los muros, a su altura real.*

> Con plano.json, armá recorrido.html: un solo archivo, three.js por import map desde jsDelivr con la versión fija. 1 unidad = 1 metro. Muros extruidos a **[2,60]** m con su espesor real, los vanos de puertas y ventanas recortados (no pintados encima), piso por ambiente y techo. La cámara arranca en la puerta de entrada, a 1,60 m de altura. Sumá un botón «Planta» que muestre todo desde arriba con el nombre de cada ambiente. Que ande fluido en un celular de gama media: geometría simple y una sola luz con sombra. Para probarlo: python3 -m http.server.

Remate: **Un solo archivo:** *recorrido.html, sin instalar nada.* (Ilustración isométrica de muros).

## Paso 03 · Amoblar con las fotos — *A medida real, sin bajar modelos.*

> Te paso las fotos de la propiedad con el ambiente en el nombre (living-1.jpg, dormitorio-1.jpg…). De cada una, decime qué muebles se ven, dónde están, su color y su material. Armalos con primitivas de three.js (BoxGeometry, CylinderGeometry, RoundedBoxGeometry) a medida real: sillón de 3 cuerpos 2,10 × 0,90 m, cama doble 1,40 × 1,90, mesa, placares, mesada. Nada de modelos bajados de internet. Que no tapen puertas ni ventanas y dejen 0,80 m de paso. Si una foto no es clara, dejalo afuera y anotalo en pendientes.md. Si se vende vacía, sumá un botón «Amoblado / Vacío».

Ilustración: living-1.jpg, living-2.jpg, dormitorio-1.jpg, cocina-1.jpg → isométrico amoblado.

## Paso 04 · Materiales y luz — *Que se parezca a la propiedad.*

Muestras: Madera (living y cuartos) · Cerámico (cocina · baño) · Pared (blanco hueso) · Luz de día (según la orientación).

> Ahora que se parezca a la propiedad. Sacá de las fotos el piso de cada ambiente (madera, porcelanato, cerámico) y el color de las paredes, y armá los materiales con MeshStandardMaterial: texturas generadas en código o color plano con su rugosidad, sin bajar imágenes con derechos. Luz de día que entre por las ventanas según la orientación **[NORTE / SUR / ESTE / OESTE]** del plano, un RoomEnvironment para los reflejos suaves y tone mapping ACES Filmic. Sumá un selector Mañana / Tarde que mueva el sol. Mostrame capturas… *(texto cortado en la imagen)*

Gancho: "— El resto, completo, por privado —" → 05 Caminarlo · 06 La ficha adentro · 07 Publicarlo (POR PRIVADO).

## Slide 07 · Del otro lado del link — *Lo que ve el comprador.*

"Abre el link en el celular y camina la propiedad con el dedo."

Mockup de celular: minimapa arriba a la derecha, etiqueta "LIVING-COMEDOR · 5,20 × 4,40 m", joystick abajo a la izquierda, "arrastrá para mirar", ficha inferior: *Depto 3 amb. con balcón* · 63 m² cub. · 2 dorm. · 1 baño · **US$ 128.000** · botón «Consultar por WhatsApp».

- **05 Se camina:** joystick, minimapa y salto a cada ambiente.
- **06 La ficha adentro,** con el botón de WhatsApp.
- **07 Un link por propiedad,** con su vista previa.

## Estructura del carrusel (9 slides)
1–2: portada / gancho (no compartidas) · 3–6: prompts 01–04 · 7: resultado para el comprador · 8–9: no compartidas (probable CTA "por privado").
