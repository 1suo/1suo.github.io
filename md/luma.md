---

kanban-plugin: board

---

## backlog

- [ ] Fix points bloom shape
- [ ] Add env files transform settings
- [ ] Unify server feedback events
- [ ] Instance ID instead of show name
- [ ] Cache indicator fix
- [ ] isLoggedIn updates immediately through app
- [ ] Tree-shaking possibilities #RnD
- [ ] Remove login to separate route
- [ ] [Optimal transport](https://www.google.com/search?q=optimal+transport+coupling&sca_esv=f020a7a3a9c0faaa&sxsrf=ADLYWIK-NsO6v9ZSkFdeCm3qQ591whOhJQ%3A1733213611940&source=hp&ei=q71OZ-fCN_OWxc8P1siY-QU&iflsig=AL9hbdgAAAAAZ07Lu1QH9-LBoamc-R5n9c2_-YWaTdRj&ved=0ahUKEwinxKHtk4uKAxVzS_EDHVYkJl8Q4dUDCBc&uact=5&oq=optimal+transport+coupling&gs_lp=Egdnd3Mtd2l6IhpvcHRpbWFsIHRyYW5zcG9ydCBjb3VwbGluZzIFEAAYgAQyCxAAGIAEGIYDGIoFMgsQABiABBiGAxiKBTILEAAYgAQYhgMYigVIigdQAFgAcAB4AJABAJgB9wGgAfcBqgEDMi0xuAEDyAEA-AEC-AEBmAIBoAKHApgDAJIHAzItMaAH7gI&sclient=gws-wiz) #RnD changing formations


## tasks

- [ ] map mode
	- [x] map camera mode
	- [ ] pointLight affect on map
	- [ ] fog in map shader
	- [x] add height map provider
	- [ ] add buildings from OSM
	- [ ] fix map rendering glitch
- [ ] ocean mode
	- [ ] increase reflection brightness (settings)
	- [ ] add procedural shore
- [ ] Fix points rendering issues
	- [x] points scale by distance (settings)
	- [x] 2k renderer on 4k screens (option in UI, perfomance issues)
	- [ ] adjust points scale by renderer size
	- [x] points opacity settings
	- [ ] texture instead of GL point (option in settings)
	- [ ] separate darken factor for scene and drones
- [ ] Animation transform in settings
	- [x] project structure update
	- [ ] DataView custom template with transform settings
	- [x] new project structure handling in ShowEdit
- [ ] What's new as docs page
- [ ] bg color picker in settings
- [ ] AR module #new
	- [x] xr controller setup
	- [x] add AR mode
	- [x] read location from device
	- [x] read location from settings
	- [ ] test on mobile
- [ ] State machine for player module #important
	- [x] states and transitions
	- [ ] event listener or public methods
	- [ ] update Player events
	- [ ] update UI events


## done

- [ ] modes DataView #new #important
	- [x] modeSchema
	- [x] new setMode function
	- [x] ModeCard component
	- [x] NewMode/EditMode window
	- [x] Save modes to server
- [ ] add point opacity settings
- [ ] add sun settings


***

## Archive

- [x] 100% dvh in mobile
- [x] ProjectCard and ShowEdit title max width
- [x] projects DataView search doesn't work
- [x] ProjectCard maxWidth=12 on mobile
- [x] projects DataView compact view
- [x] animations DataView maxWidth=12 on mobile
- [x] Home button in viewer
- [x] swipeIcon in settings
- [x] mobile header in AdminPage

%% kanban:settings
```
{"kanban-plugin":"board","lane-width":380,"tag-colors":[{"tagKey":"#core","color":"rgba(255, 255, 255, 1)","backgroundColor":"rgba(81, 61, 163, 1)"},{"tagKey":"#ui","color":"rgba(0, 0, 0, 1)","backgroundColor":"rgba(68, 255, 243, 1)"},{"tagKey":"#hot","color":"rgba(255, 255, 255, 1)","backgroundColor":"rgba(245, 93, 93, 1)"},{"tagKey":"#request","color":"rgba(255, 255, 255, 1)","backgroundColor":"rgba(12, 12, 20, 1)"},{"tagKey":"#R&D","color":"rgba(255, 255, 255, 1)","backgroundColor":"rgba(116, 0, 172, 0.81)"}],"list-collapse":[null,null,false],"show-checkboxes":false}
```
%%