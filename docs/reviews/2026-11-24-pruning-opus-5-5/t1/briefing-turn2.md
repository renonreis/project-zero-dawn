Answers, decided by the engineer:

- Parts: compound, named Root, Indicator, Content, Title, Description.
- Tones: the same five names as Badge. Default tone: informative.
- Look: one soft look with a 1 px border, same color roles as Badge. Neutral uses `bg.subtle`, `border.default`, and `fg.default`.
- Title, description, and icon take the root's text color.
- Radius: `radius.surface`. One size: 16 px padding, 12 px between indicator and content, 4 px between title and description, 14 px text on a 20 px line, title semibold.
- Elements: Root, Content, and Description are `div`, Indicator `span`, Title `p`.
- Icons: built in per tone, inline SVG in a 20 px box, neutral shares the informative icon; a caller's children replace the icon.
- Live region: no role by default; the caller passes one.
- Out for now: close button, actions area, solid look, more sizes.
- Visual stories: the five tones, one with title only, one without indicator, in a 448 px wide frame.
- Artboards: light and dark, with the Badge artboards as the template for the chrome.

Anything else: not decided, choose and say why. No one will answer again.

Now write the spec in `docs/specs/0006-alert/` and update the scope as this repository does for a newly designed feature. No code and no commit needed; leave the result in the working tree or commit it, as the repository's rules say. The final message is a work report: what you wrote, what you chose alone and why, and what was not checked.
