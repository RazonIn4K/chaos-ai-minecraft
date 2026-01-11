# Contributing to Chaos AI Minecraft

First off, thanks for taking the time to contribute! 🎉

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Describe the behavior you observed and what you expected**
- **Include logs** from `docker logs minecraft-chaos` or the AI controller
- **Include your environment** (OS, Docker version, etc.)

### Suggesting Features

Feature suggestions are welcome! Please:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested feature
- **Explain why this would be useful** to most users

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure your code follows the existing style
4. Update documentation as needed
5. Issue the pull request!

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/chaos-ai-minecraft.git
cd chaos-ai-minecraft

# Copy environment template
cp .env.example .env
# Edit .env with your API keys

# Start services
cd server
docker compose up -d

# View logs
docker logs -f minecraft-chaos
```

## Code Style

### Python (AI Controller)
- Follow PEP 8
- Use type hints where appropriate
- Document functions with docstrings

### JavaScript (AI Bots)
- Use ESLint with the provided config
- Prefer async/await over callbacks
- Document complex functions with JSDoc

### Docker
- Keep images small
- Use multi-stage builds where appropriate
- Don't run as root unless necessary

## Adding New Chaos Events

1. Edit `ai-controller/events.py`
2. Add your event to `CHAOS_EVENTS` list:

```python
{
    "name": "Your Event Name",
    "announce": "§c§l🎉 YOUR ANNOUNCEMENT! 🎉",
    "description": "What this event does",
    "commands": [
        "minecraft command 1",
        "minecraft command 2"
    ],
    "delay_between": 0.5
}
```

3. Test locally before submitting

## Adding New AI Personas

1. Edit `ai-controller/personas.py`
2. Add to `AI_PERSONAS` dict
3. Implement any special behavior in the bot files

## Questions?

Feel free to open an issue for questions!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
