
## done

- [x] Swipe icon on start<br>#request #ui
- [ ] ----<br>***_Non-planned:_***


## tasks

- [ ] UI bugfix: <br>- [x] animation name maxwidth: adminPage, dataTable, secondaryControls<br>- [x] swipeIcon hide on touchStart & mouseDown<br>- [x] add tags and stars to projects with obsolete schema<br>- [ ] swipeIcon option in settings<br>- [x] time display width -- content<br>- [x] add animations from create show<br>- [x] uploadDialog in adminPage<br>- [x] progressSpinner fix<br>- [x] SecondayControls layout fix<br>- [x] Border 1px across UI<br>- [x] Border-radius "4xl"<br>- [x] SecondaryControls overflow slider<br>- [x] Timeline slider height and pointer
- [ ] Set animations list in Player
- [ ] Settings parent path in @change event
- [x] Fix create project errors
- [ ] ----<br>***_Debt:_***


## 14.05.2024

- [ ] map mode<br>- [ ] map camera mode<br>- [ ] pointLight affect on map<br>- [ ] fog in map shader<br>- [ ] add height map provider<br>- [ ] add buildings from OSM
- [ ] ocean mode<br>- [ ] increase reflection brightness<br>- [ ] add procedural shore
- [ ] adjust point size to resolution | option in settings
- [ ] separate darken factor for scene and drones
- [ ] animation display name and custom transform
- [ ] add point opacity settings
- [x] env mode -> envSelect
- [ ] add sun settings
- [ ] AR module


## Backlog

- [ ] Fix map rendering glitch<br>#scene #postprocessing
- [ ] Fix points bloom shape<br>#postprocessing
- [ ] Add env files transform settings<br>#settings
- [ ] State machine for player module<br>#core #player
- [ ] Unify server feedback events<br>#server
- [x] Settings/schema match function
- [ ] bg color picker in settings
- [ ] Instance ID instead of show name<br>#core
- [ ] Cache indicator fix
- [ ] isLoggedIn updates immediately through app
- [ ] Further nvestigations on tree-shaking possibilities <br>#R&D
- [ ] 15.07.2024:
- [ ] Remove login to separate route
- [x] dvh for scene on mobile
- [ ] Points scale multiplier by distance in settings
- [ ] What's new as docs page
- [ ] 2k renderer resolution on 4k screens


## ТЗ 0.3 - адаптировано

- [ ] Возможность загружать анимацию 2000+ дронов на 20 000+ фреймов и отображать без тормозов. Максимально сократить время ожидания на загрузку анимации (если на клиенте). Добавить прогрессбар при загрузке.
- [ ] Стриминг с сервера, найти самый быстрый и надёжный способ стримить видео с анимацией с сервера клиенту. Масштабирование в зависимости от количества клиентов.
- [ ] Карта. Доделать воспроизведение карты до горизонта, горизонт должен уходить в туман. Цвет текстуры должен соответствовать ночному времени суток. Добавить background звездного неба. Дать пользователю возможность вводить координаты.
- [ ] Добавить новые HDRI с масками и интерфейс для загрузки GLTF окружения.
- [ ] Доработка визуальной составляющей (convolution bloom, lens flares, антиалайзинг, туман)
- [ ] Возможность воспроизведения музыки во время анимации, не должно происходить рассинхрона.
- [ ] iFrame возможность запуска с любой страницы в окне


## tasks(future)

- [x] Компрессия данных в шорты
- [ ] Спрайт с альфой
- [x] Хэдеры для айфрейм
- [x] Батчинг кадров
- [ ] Блюм в два слоя, блики линзы, АА
- [x] Прогрессбар загрузки
- [x] Архивирование бинарника
- [ ] Синхрон с музыкой
- [x] Админка
- [x] Карта
- [ ] Две базы данных
- [x] Конкат цветов и координат
- [x] Сделать model-view
- [ ] Прототип на wasm


## *ТЗ по БД для Александра*

- [ ] Две базы данных -- одна с абсолютными значениями координат, другая с изменениями координат относительно прошлого кадра и абсолютными цветами.
- [ ] Если цвет или координата не изменилась с прошлого кадра, во второй бд заменять три нуля одним символом. Черный цвет (rgb=0,0,0) можно заменять так же.
- [ ] Первые 6 значений в строке - координаты центра и усредненный цвет (это для цвета тумана и тона глтф, может надо подумать, как его считать)
- [ ] *Делить цвета на абсолютные и относительные значения, как и хранить их в двух базах, смысла нет. Поэтому цвета только во второй базе и в абсолютных значениях. Когда я запрашиваю кадр из первой базы (при ручной смене таймлайна)*


## ТЗ

- [ ] Возможность выбора окружения (чёрный фон, панорама HDRI, привязка к местности, 3D-сцена с шейдерами))
- [ ] Выбор режима камеры (Следить/не следить за анимацией, смотреть из позиции зрителя, вращаться вокруг анимации, свободное перемещение)
- [ ] Включить/выключить масштабную линейку.


## SSR:

- [ ] Новый кластер и диспоз для каждого клиента
- [ ] LDR и маска
- [ ] Загрузка 3д-модели - в процессе
- [ ] Обработка json другим модулем / стрим
- [ ] Обработка сфер отдельно при выборе файла (??)


***

## Archive

- [x] Демо/ Встраивание в айфрейм
- [x] Демо/ Фулскрин
- [x] Демо/ Формат бинарника и зашивка в билд
- [x] Демо/ Варианты фона
- [x] Выбор файла
- [x] Режим ускорения Х1, Х2, Х4, Х8
- [x] Таймлайн анимации с возможностью перемещения по нему.
- [x] Возможность ввода координат для привязки анимации к локации.
- [x] Возможность вращать анимацию вокруг вертикальной оси.
- [x] Включить/выключить туман.
- [x] Развернуть тест на сервере
- [x] Размер канваса
- [x] Переписать на CJS
- [x] Орбит контролс
- [x] Режимы просмотра
- [x] Подтянуть карту местности по координатам из файла на сервере
- [x] Туман и блум
- [x] Обновление таймлайна
- [x] Скорость воспроизведения
- [x] Обрезать разрешения файлов на клиенте
- [x] Вращение вокруг вертикали
- [ ] Демо/ Блум только одного слоя с дронами
- [x] Фикс слета анимации
- [x] Фикс зацикленности
- [x] Общая схема кэширования
- [x] Реализация кэширования
- [x] Разбор проекта на модули
- [x] BatchEnd при запуске всегда 0, походу из-за него слетает рендер, когда готовые батчи в ДБ хуй знает из чего
- [x] Проверка рендера точек
- [x] no frame data / batch update after return from end to zero frame
- [x] animation doesn't start automatically on app launch when data is not in cache
- [x] playback batch cycling issue
- [x] add clear db&storage button
- [x] add loader
- [x] add point light
- [x] add data size alert
- [x] add visuals (shaders/bg/css)
- [x] global context
- [x] синглтон для идб
- [x] синглтон для сцены
- [x] Implement updateControls()
- [x] Убрать лишние внутренние ивенты
- [x] Copy link button
- [x] Secondary controls template
- [x] Sidebar template
- [x] Limit DbManager to Player
- [x] Check if STORE_NAME has data at launch, remove loader
- [x] missedCacheIdx for STORE_NAME
- [x] Show setup<br>- [x] load files via links<br>- [ ] load files via upload<br>- [x] create basic presets files and use in setup
- [x] Fix Nan batch request
- [x] Clean SceneManager
- [x] Clean Scene component
- [x] Navigator clipboard copy
- [x] Presets contain v-if for controls
- [x] Choose show function<br>- [x] Load shows in Scene component<br>- [x] Dropdown event
- [x] Fix points disappearing on updateUI
- [x] Batch requests are from Player
- [x] Update loaderOverlay logic
- [x] Separate dbPromise for each show
- [x] Fix initial loading time
- [x] Player and db setup for animation change <br>#core #hot
- [x] Implement modes<br>#core #mid <br>- [x] Create structure<br>- [x] Add to templates<br>- [x] Mode switch in SceneManager
- [x] ShowEdit alpha version #core #hot <br>- [x] Update settings proxy<br>- [x] Save settings<br>- [x] Cards layout<br>- [x] Slider value fix<br>- [x] Hide disabled settings<br>- [x] Scene preview component
- [x] Adjust SafeBuffer according to dbSize <br>#core #mid #request
- [x] Loading overlay in Vue, update with event <br>#ui
- [x] Remove player settings from file
- [x] Presets for controls, options stored in settings
- [x] ShowEdit updates<br>#hot <br>- [x] Scene reactive component, embedding/standalone setings processing<br>- [x] Settings revert function<br>- [x] Scene reload function<br>- [x] SettingsCard&SettingsItem two-way reactive components<br>- [x] Animations upload/delete<br>- [x] glb files upload/delete
- [x] Layout and styling<br>#ui #issue<br>- [x] Custom ButtonGroup for modes switch (Scene)<br>- [x] ButtonGroup for hot actions (Settings section)<br>- [x] Mobile layout<br>- [x] Upload files component<br>- [x] Overall styling improvements<br>- [x] Dynamic header for scene
- [x] Core and Scene updates<br>- [x] Cache indicator<br>- [x] Forced closing IDB promises on show change<br>- [x] Togglebutton fix
- [x] Scene updates<br>#hot <br>- [x] Migrate selective bloom from old project<br>- [x] Basic modes fine-tuning<br>- [x] Header visibility fix in standalone mode<br>- [x] No controls on mobile fix
- [x] glb files links in settings
- [x] Static models mode with no bg <br>#request
- [x] ShowEdit updates<br>- [x] Workaround for schema/settings mismatch<br>- [x] Animation options schema (custom transforms and name)<br>- [x] Animation options UI (expandable DataTable row)<br>- [x] Save settings as preset<br>- [x] View in standalone function
- [x] Add procedural sky and sky settings<br>#issue
- [x] Additive blending for points shader<br>#issue
- [x] Three.js version migration r150-r162<br>#issue
- [x] Global animations index and links in settings<br>- [x] Schema and for animations data<br>- [x] Update creating and handling project data<br>#core #hot
- [x] Implement new sql format<br>#core #hot
- [x] New environment handling logic<br>#core #hot #ui <br>- [x] Global envFiles index<br>- [x] Linking envFiles to project<br>- [x] Lazy-loading envFiles<br>- [x] Reactive UI element for env switching and scene state
- [x] Projects index file for storing project state/tags/info<br>#server
- [x] Adjust logic to global files indexing
- [x] Big files upload from Google drive fix
- [x] Add existing animations to project
- [x] Fix environment switch and lazy loading
- [x] Fix settings loading when in Iframe
- [x] In-built version system<br>#core <br>- [x] Version scope/schema<br>- [x] Clear cache based on version<br>- [x] Mark shows with data version tag
- [x] Fix smooth loader switch
- [x] Display tags and project info
- [x] Fix loading animation from team drive<br>#server
- [x] Replace sortPoints with wasm function<br>#core
- [x] Wasm decoder module and obfuscated binaries<br>#core
- [x] Add procedural water<br>#scene
- [x] Add darken postprocessing layer<br>#postprocessing
- [x] Migrate from three-geo to geo-three<br>#core #scene

%% kanban:settings
```
{"kanban-plugin":"basic","lane-width":380,"tag-colors":[{"tagKey":"#core","color":"rgba(255, 255, 255, 1)","backgroundColor":"rgba(81, 61, 163, 1)"},{"tagKey":"#ui","color":"rgba(0, 0, 0, 1)","backgroundColor":"rgba(68, 255, 243, 1)"},{"tagKey":"#hot","color":"rgba(255, 255, 255, 1)","backgroundColor":"rgba(245, 93, 93, 1)"},{"tagKey":"#request","color":"rgba(255, 255, 255, 1)","backgroundColor":"rgba(12, 12, 20, 1)"},{"tagKey":"#R&D","color":"rgba(255, 255, 255, 1)","backgroundColor":"rgba(116, 0, 172, 0.81)"}]}
```
%%