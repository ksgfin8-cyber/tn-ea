# TN-R01 · Auditoría del modelo Tortuga Ninja

**Base:** [4217f70e2a140d03746873183dad5328a65e1fba](https://github.com/ksgfin8-cyber/tn-ea/tree/4217f70e2a140d03746873183dad5328a65e1fba). **Marco:** [RDL-PB-001 v0.1](../program/RDL-PB-001_v0.1_original_propuesta.md). El objeto estudiado es TN como modelo de representación, selección y evaluación retrospectiva, con su política y conductor históricos como capas identificables. Fuentes del objeto: [matemática v5.4](../../TN-LAB-Mathematical-Specification.md), [canónica v5.7](../../TN-LAB-CANONICAL-SCIENTIFIC-SPECIFICATION.md) y [arquitectura](../../TN-LAB-Computational-Architecture.md). El R01 histórico de Computational-Lab, enlazado desde el README, aporta antecedentes. Esta investigación ejecuta el motor preservado en tn-ea, con preguntas y datos propios.

**Dictamen.** TN sigue siendo un objeto útil para investigar selección adaptativa. En la versión estudiada, el contraste encuentra un problema de unidades, una anticipación dentro de la evaluación retrospectiva y una traza histórica con referencias compartidas. GEI quedó por detrás del Random Walk en las nueve trayectorias del protocolo. La evidencia prioriza precisar las unidades y los cortes de información antes de usar el resultado retrospectivo como evidencia predictiva.

## Protocolo previo TN-R01-P1

Candidato 4217f70e2a140d03746873183dad5328a65e1fba. Motor TypeScript y conductor histórico sin cambios. Presupuesto inicial: una comprobación estática y dos corridas locales deterministas sin red, con nueve series de 180 observaciones y controles dirigidos. Sin ajuste de parámetros. Comparaciones de números continuos con tolerancia absoluta 1e-10 más 1e-9 relativa; decisiones discretas exactas. Excluir lastUpdate solo al comparar el estado matemático y documentar su alcance.

| Pregunta y modos | Diseño, criterio y cierre |
| --- | --- |
| P1 · M1/M2. ¿Qué implementa TN y qué invariantes preserva? | Matriz entre especificaciones v5.4/v5.7, código y ejecución. Verificar dimensiones, determinismo de características, rango Φ y un id activo por barra. Contrastar I1 condicional vs diagnóstico móvil e I5 softmax vs frecuencias, con controles explícitos. Evaluar entradas constantes, cortas, cero y no finitas como exploración de dominio. Un caso contrario delimita la afirmación. |
| P2 · M2/M3. ¿Es causal el cálculo a cada escala? | Comparar traza común con sufijo añadido, por separado de las parejas internas de predicción. Para un origen interno fijo, conservar su prefijo, intervenir el sufijo usado por los descriptores y contrastar con estadísticas calculadas solo hasta el origen. Comparar memoria de snapshots en origen y ejecución extendida. Una diferencia determinista localiza la obligación. |
| P3 · M3/M4. ¿Qué aporta el selector? | Nueve trayectorias sintéticas, tres semillas por familia: deriva, reversión a 100 y cambio de régimen. Parámetros y generador en el arnés. Desde el tick 50 pronosticar precio del tick siguiente. Comparar GEI congelado, Random Walk independiente y dos teorías fijas de la misma biblioteca. Reportar MAE por trayectoria y familia, selección y cambios, usando exactamente los mismos objetivos; una ventaja requiere menor MAE y se declara solo en la población probada. Aislar el aporte del régimen cambiando solo su campo al puntuar una ventana, sin interpretar la intervención como mercado real. |
| P4 · M5/M6/M7. ¿Qué se puede usar y transferir? | Probar el motor y el protocolo en una telemetría positiva sintética determinista y contrastar la misma serie en dos escalas. Verificar repetición exacta de JSON en el mismo instrumental. Registrar dependencias, tiempos separados del JSON, controles útiles y límites. No medir productividad sin línea base ni generalizar a mercado. |

## M1 · Candidato y frontera del modelo

Entradas de Γ: secuencias de precios, con logaritmo de cocientes sobre pares positivos finitos como dominio de trabajo del protocolo. El estado matemático agrega cinco escalares, veinte autocorrelaciones, 33 potencias espectrales y una etiqueta de régimen. El objeto devuelto incluye metadatos y representación del eje espectral. GEI puntúa diez teorías usando ventana, descriptores, teoría activa, historial de transiciones y uso acumulado. La selección tiene margen de mejora y veto por ciclos. Φ calcula una reducción relativa de error dentro de la ventana, con recorte y piso numérico. Π obtiene una señal discreta usando un umbral que se actualiza después de decidir. El conductor mantiene historiales, cuenta activaciones y arma registros por barra. Los nueve módulos del motor solo importan archivos internos. La ejecución del estudio usa Node y un cargador local en el arnés.

## M2 · Verificación y conformidad

| Propiedad | Evidencia y alcance |
| --- | --- |
| I1 · Estabilidad | v5.4 enuncia varianza condicionada a H. [checkInvariantI1](../../src/engine/phi.ts#L126) recibe solo historial de Φ y calcula varianza móvil. Un historial alternante 0/1 produce 0.255102 y falla el umbral 0.1. **IMPLEMENTADO** el diagnóstico móvil. El enunciado condicional queda **NO EVALUADO**. |
| I2 · Determinismo de Γ | Dos llamadas con la misma serie coinciden en la proyección de características y difieren en lastUpdate. La dimensión se comprobó en los ticks de las nueve cohortes y las dos escalas de telemetría. **VERIFICADO en las condiciones ensayadas** para la proyección matemática. Hay un contraejemplo para igualdad literal del objeto registrado. |
| I3 · Φ en [0,1] | El recorte y la guarda de no finitos imponen la cota en computePhi. Pasaron las comprobaciones de rango de todas las trazas del contraste. En una serie constante, Random Walk obtiene Φ=1, porque el error es cero y la referencia cero se sustituye por 1e-10. La cota y el significado de ese extremo son preguntas diferentes. |
| I4 · Teoría activa única | Se verificó un identificador entero válido por tick en las trazas del contraste. La política siempre selecciona una teoría activa, aunque pueda abstenerse de emitir dirección. |
| I5 · Diversidad | La v5.4 declara entropía del softmax de costes; [el conductor](../../src/simulator/backtest.ts#L249) entrega el historial de activaciones a computeTheoryEntropy. Costes iguales dan entropía teórica ln(10)=2.302585, mientras que un historial de una sola teoría da 0. Son distribuciones diferentes. El diagnóstico del conductor pasó entre 64.6% y 99.2% de los ticks según trayectoria. El invariante descrito por softmax queda **NO EVALUADO** en la trayectoria. |
| Unidades | v5.4 §5.1 declara predicción de Δprecio. [computePredictionError](../../src/engine/theories.ts#L421) puntúa contra el nivel siguiente de precio. Además, la media de log-retornos calculada por Γ se usa como nivel de reversión en [T1](../../src/engine/theories.ts#L125) y en su comparación direccional. En el testigo de prefijo, T1 predice −27.079048 sobre una serie positiva cercana a 100. Es evidencia contraria a tratar todas las salidas como pronósticos de precio dimensionalmente coherentes. |
| Definiciones de Φ | El coste negativo mínimo de la especificación y la reducción del MAE tienen insumos distintos. Con costes [0.7, 0.8], computePhiMinCost devuelve 0 tras recorte. Para costes no negativos, su cociente con signo negativo se recorta siempre a 0. No se estableció equivalencia con el Φ operativo ni la entropía. |
| Extremos de entrada | Tres precios producen estado por defecto con sampleSize=0. La secuencia [100,0,100,101,102] produce sampleSize=5 y la que contiene infinito devuelve 0. Estos casos delimitan respuestas observadas. No representan una validación general de sanidad de entrada. |

## M3 · Causalidad, estado y mecanismos

- **Corte externo:** las 70 filas comunes de la variante con y sin sufijo coincidieron exactamente en características sin reloj, teoría, θ, señal y diagnósticos Φ/GEI/entropía que proyecta el arnés. El resultado tiene alcance de un caso dirigido.
- **Corte interno:** computePredictionError limita el vector de precios de cada pronóstico al origen local, pero pasa estadísticas de la ventana envolvente a todos esos orígenes. evaluateTheory entrega esas mismas estadísticas a sus dos segmentos 70/30. En el control, manteniendo el prefijo y cambiando solo el sufijo que usa Γ, se alteraron T1, T3 y T7. Con precios idénticos en la prueba de error focal, T1 pasó de MAE 95.686186 a 95.693651 entre las dos estadísticas perturbadas y dio 121.127184 con estadísticas del prefijo. La intervención muestra anticipo relativo al origen interno. Al emitir una decisión al cierre de la ventana, esos datos ya pertenecen al pasado de esa decisión externa.
- **Integridad de registro:** las filas comparten los arreglos performance y transitions con el estado final. El primer tick almacenado mostró 22 transiciones al leerlo tras la corrida, aunque hasta ese tick habían ocurrido 0. Hay evidencia contraria para una traza completa interpretable como instantáneas históricas. Separadamente, cycleDetected se inicializa a false y cycleCount a 0 sin actualizaciones en el conductor. Esos campos no permiten medir los vetos internos del selector.
- **Régimen:** al intervenir solo la categoría de régimen del mismo estado y mantener ventana, teoría inicial y demás entradas, las categorías 0/1/2/3 retuvieron o seleccionaron las teorías 0/2/4/0. El control demuestra dependencia, no cuantifica cuánto aporta esa categoría en mercado.

## M4 · Comparación emparejada

Tres semillas por familia. Cada fila resume 387 errores a siguiente barra en las mismas posiciones para los cuatro métodos. El precio actual es la referencia Random Walk independiente. Las teorías fijas usan predict con las mismas estadísticas y ventana disponibles en el origen. MAE en unidades de precio.

| Familia | GEI | Random Walk | Tendencia fija | Reversión fija |
| --- | ---: | ---: | ---: | ---: |
| Deriva | 1.893573 | 0.084585 | 0.064768 | 117.580991 |
| Reversión | 1.947177 | 0.159365 | 0.163740 | 115.521765 |
| Cambio de régimen sintético | 2.109409 | 0.251379 | 0.241230 | 112.865018 |

GEI perdió frente a Random Walk en 9/9 trayectorias y usó como teoría dominante la 8 en las nueve. Entre barras con Φ>0, GEI ganó en error absoluto de la barra siguiente en 225/297, 18/50 y 98/181 en las tres familias. Son conteos descriptivos de observaciones dependientes. No hay contraste de significancia ni estimación de rendimiento externo. La reversión fija sirve para exponer la conducta de la implementación de T1. Una prueba futura del mérito de la familia de reversión exige un comparador que formule sus unidades correctamente.

## M5–M7 · Decisión, transferencia y método

- **G0/G1, caracterizar:** continuar como objeto de investigación. Los operadores ejecutan y las modalidades de análisis local son viables.
- **G2, diferencial:** evidencia contraria frente a Random Walk dentro del banco fijado. Prioridad propuesta: especificar unidades y objetivos por teoría y definir corte por origen para evaluación interna antes de repetir el contraste. La rentabilidad, la eficacia de Π y la capacidad predictiva en mercado permanecen **NO EVALUADAS**.
- **G3, fiabilidad:** conservar integridad de datos de origen, distinguir instantáneas de referencias compartidas y exponer motivos de veto antes de usar las trazas como evidencia causal completa. Precisar Φ en referencia cero e I1/I5 antes de declarar conformidad.
- **G4, transferencia:** se ensayó telemetría no financiera sintética positiva. El motor ejecutó a escala 1 y 1000. El MAE GEI, reexpresado en la unidad original, fue 1.178294 y 1.178688, con las mismas 17 transiciones en conteo. El MAE de la referencia fue 0.175651 en ambas escalas al normalizar. Se comprobó ejecución técnica, con evidencia contraria a equivalencia exacta del error bajo escala. La aptitud para datos externos o para otra familia física sigue abierta.
- **G5, inversión:** suspender recomendaciones de despliegue. Autorizar cambios corresponde a una decisión posterior. Reapertura propuesta con contrato de unidades, referencia causal comparable y contraste fuera de la muestra usada para diseñar la variante.
- **Activos y metainvestigación:** son reutilizables el contraste de prefijo, el control de origen interno, el comparador de mismo objetivo y el control de instantánea. Por separado evitan falsos positivos que daría una sola prueba de corte. El cargador es específico de esta familia de fuentes y versión de Node. No se midió productividad institucional ni se acreditó implementación independiente.

## Reproducción y cierre

Node 24.22.3, entorno local sin red, sin dependencias instaladas y sin cambios al código del candidato. Primero se comprobó identidad Git de los diez archivos TypeScript. El intento de usar TypeScript nativo directamente falló por imports de interfaces como bindings en runtime. El arnés suministra un cargador que resuelve rutas locales y elimina imports de interfaces y tipos durante la carga, luego transforma TypeScript con Node. La compilación y el chequeo de tipos con tsc quedan **NO EVALUADOS**. El protocolo previo se guardó antes de ejecutar (SHA-256 4e36d192a4e6b74d916917d62c38df24674cde8abf8efdcb42302f6d04322306, desde su encabezado hasta el salto final). Los ajustes instrumentales fueron corregir el nombre del campo espectral y adecuar la carga a Node. Se mantuvieron las preguntas, casos y criterios.

```sh
node --disable-warning=ExperimentalWarning docs/research/tn_r01.mjs > /tmp/tn-r01-a.json
node --disable-warning=ExperimentalWarning docs/research/tn_r01.mjs > /tmp/tn-r01-b.json
cmp /tmp/tn-r01-a.json /tmp/tn-r01-b.json
sha256sum /tmp/tn-r01-a.json
```

Las dos corridas pasaron las aserciones y dieron JSON idéntico, SHA-256 917ba603d658c433358e0080da874e30a45871bf0d271fee3ebb156e4aff159e. Tiempos de reloj observados 1.019 s y 0.878 s. Los resultados detallados por semilla, controles y escalas se generan con el arnés. Esta repetibilidad corresponde al mismo instrumental. El cierre recomendado es utilizar TN como candidato de investigación, mantener las pruebas dirigidas como regresión y dirigir la siguiente inversión a semántica, causalidad interna e integridad de traza.
