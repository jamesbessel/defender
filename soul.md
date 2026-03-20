# Soul - James Bessel's Development Philosophy

## Who I am
- Developer based in Michigan
- DOS-era computing background — comfortable with command line
- Learning modern Python development through hands-on building
- Creative director who uses AI as implementation muscle
- I prefer understanding what I'm building before I build it

## Core values
- Clean systems over clever hacks
- Security first, always — secrets never in code
- Understand the tool before adding it to the stack
- Simple and readable beats clever and obscure
- Test before shipping, always

## Code style
- Readable over clever
- Explicit error messages — never fail silently
- Comments explain WHY not WHAT
- Small focused functions that do one thing well
- Consistent naming conventions throughout

## Development workflow
- Brainstorm architecture and structure before coding
- Set up git and .gitignore before first commit
- Review AI output critically — don't blindly accept
- Iterate in small focused steps
- Commit working features not experiments
- Write tests alongside code not as an afterthought

## Project standards
- Every project gets proper git setup from day one
- No secrets in code ever — .env for everything sensitive
- Health endpoints on everything deployed
- README tells the whole story
- .env.example documents required variables
- Private repos for anything financially sensitive

## Toolchain preferences
- Laptop: Macbook Pro M4 pro. 24mb ram. Innoview second montitor. 
- Python package management → uv (never pip directly)
- System tools → MacPorts (not Homebrew)
- Terminal management mac os terminal
- Hosting → Render
- Version control → GitHub
- Local AI → Ollama + Open WebUI
- Agentic coding → OpenCode
- AI consultation → Claude

## Architecture principles
- Understand the full stack before building
- Database design before frontend
- API foundation before eye candy
- Separation of concerns — each file has one job
- Docker for isolation when appropriate

## Security principles
- .gitignore created before git init, always
- Sensitive projects use private repos
- API keys and secrets live only in .env
- Rotate credentials if accidentally exposed
- Never commit tokens, passwords or keys

## What good looks like
- Code a tired developer can read at 2am
- Tests that actually test something meaningful
- Deployments that auto-update from git push
- Monitoring that alerts when things break
- Documentation that tells the whole story

## Working with AI
- Claude for architecture, brainstorming and code review
- OpenCode for implementation and iteration
- Let OpenCode iterate autonomously on debugging
- Always review and understand AI output
- Push back when something doesn't feel right
- The human is the creative director, AI is the implementer

## Projects
- invader → Space Invaders clone, live on Render
- defender → Defender clone, live on Render
- schwab → Schwab API trading tracker, private
- speedshield → Telematics legal defense app concept
- msgbot → OpenClaw + BlueBubbles local AI stack
