"""
Chronicle Discord Integration for Sentinel Bot

Add this cog to your Sentinel bot to enable Chronicle commands:
- /chronicle add - Add a new event to the timeline
- /chronicle recent - Show recent events
- /chronicle search - Search events
- /chronicle stats - Show statistics

Installation:
1. Copy this file to your bot's cogs/ directory
2. Add 'chronicle' to your COGS list in .env or config
3. Set CHRONICLE_API_URL environment variable
"""

import discord
from discord import app_commands
from discord.ext import commands
import aiohttp
from datetime import datetime
from typing import Optional, Literal

CHRONICLE_API_URL = "https://chronicle.hrmsmrflrii.xyz"

CATEGORY_CHOICES = [
    app_commands.Choice(name="Infrastructure", value="infrastructure"),
    app_commands.Choice(name="Service", value="service"),
    app_commands.Choice(name="Milestone", value="milestone"),
    app_commands.Choice(name="Fix", value="fix"),
    app_commands.Choice(name="Documentation", value="documentation"),
    app_commands.Choice(name="Network", value="network"),
    app_commands.Choice(name="Storage", value="storage"),
]

CATEGORY_COLORS = {
    "infrastructure": 0x3B82F6,  # Blue
    "service": 0x22C55E,  # Green
    "milestone": 0xA855F7,  # Purple
    "fix": 0xEF4444,  # Red
    "documentation": 0xEAB308,  # Yellow
    "network": 0x06B6D4,  # Cyan
    "storage": 0xF97316,  # Orange
}


class Chronicle(commands.Cog):
    """Chronicle timeline integration commands."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.api_url = CHRONICLE_API_URL

    async def _fetch(self, endpoint: str, method: str = "GET", data: dict = None):
        """Make API request to Chronicle."""
        url = f"{self.api_url}/api{endpoint}"
        async with aiohttp.ClientSession() as session:
            if method == "GET":
                async with session.get(url) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    return None
            elif method == "POST":
                async with session.post(url, json=data) as resp:
                    if resp.status in [200, 201]:
                        return await resp.json()
                    return None

    chronicle = app_commands.Group(name="chronicle", description="Homelab Chronicle commands")

    @chronicle.command(name="add", description="Add a new event to the Chronicle timeline")
    @app_commands.describe(
        title="Event title",
        category="Event category",
        content="Event description",
        tags="Comma-separated tags",
        node="Infrastructure node (e.g., node01, docker-media)",
    )
    @app_commands.choices(category=CATEGORY_CHOICES)
    async def chronicle_add(
        self,
        interaction: discord.Interaction,
        title: str,
        category: app_commands.Choice[str],
        content: str,
        tags: Optional[str] = None,
        node: Optional[str] = None,
    ):
        """Add a new event to Chronicle."""
        await interaction.response.defer()

        tag_list = [t.strip() for t in tags.split(",")] if tags else []
        tag_list.append("discord")

        event_data = {
            "title": title,
            "date": datetime.utcnow().isoformat() + "Z",
            "content": f"<p>{content}</p>",
            "category": category.value,
            "tags": tag_list,
            "source": "discord",
            "sourceRef": f"discord-{interaction.user.id}",
            "infrastructureNode": node,
        }

        result = await self._fetch("/events", "POST", event_data)

        if result:
            embed = discord.Embed(
                title="Event Added",
                description=f"**{title}**",
                color=CATEGORY_COLORS.get(category.value, 0x808080),
                timestamp=datetime.utcnow(),
            )
            embed.add_field(name="Category", value=category.name, inline=True)
            if node:
                embed.add_field(name="Node", value=node, inline=True)
            if tags:
                embed.add_field(name="Tags", value=tags, inline=True)
            embed.set_footer(text=f"Added by {interaction.user.display_name}")

            await interaction.followup.send(embed=embed)
        else:
            await interaction.followup.send(
                "Failed to add event to Chronicle. Check the API connection.",
                ephemeral=True,
            )

    @chronicle.command(name="recent", description="Show recent Chronicle events")
    @app_commands.describe(limit="Number of events to show (max 10)")
    async def chronicle_recent(
        self,
        interaction: discord.Interaction,
        limit: Optional[int] = 5,
    ):
        """Show recent events from Chronicle."""
        await interaction.response.defer()

        limit = min(limit, 10)
        events = await self._fetch(f"/events?limit={limit}")

        if not events:
            await interaction.followup.send("Failed to fetch events or no events found.")
            return

        embed = discord.Embed(
            title="Recent Chronicle Events",
            description=f"Showing last {len(events)} events",
            color=0x6366F1,
            timestamp=datetime.utcnow(),
        )

        for event in events:
            date = datetime.fromisoformat(event["date"].replace("Z", "+00:00"))
            date_str = date.strftime("%b %d, %Y")

            # Truncate content
            content = event.get("content", "")[:100]
            content = content.replace("<p>", "").replace("</p>", "")
            if len(event.get("content", "")) > 100:
                content += "..."

            embed.add_field(
                name=f"{event['title']} ({event['category']})",
                value=f"{date_str} - {content}",
                inline=False,
            )

        embed.set_footer(text="View full timeline at chronicle.hrmsmrflrii.xyz")
        await interaction.followup.send(embed=embed)

    @chronicle.command(name="search", description="Search Chronicle events")
    @app_commands.describe(
        query="Search query",
        category="Filter by category",
    )
    @app_commands.choices(category=CATEGORY_CHOICES)
    async def chronicle_search(
        self,
        interaction: discord.Interaction,
        query: str,
        category: Optional[app_commands.Choice[str]] = None,
    ):
        """Search Chronicle events."""
        await interaction.response.defer()

        endpoint = f"/search?q={query}&limit=10"
        if category:
            endpoint += f"&category={category.value}"

        result = await self._fetch(endpoint)

        if not result or not result.get("events"):
            await interaction.followup.send(f"No events found for '{query}'")
            return

        events = result["events"]
        embed = discord.Embed(
            title=f"Search Results: {query}",
            description=f"Found {result['totalCount']} events",
            color=0x6366F1,
        )

        for event in events[:5]:
            date = datetime.fromisoformat(event["date"].replace("Z", "+00:00"))
            date_str = date.strftime("%b %d, %Y")

            embed.add_field(
                name=event["title"],
                value=f"{date_str} | {event['category']}",
                inline=False,
            )

        if result["totalCount"] > 5:
            embed.set_footer(text=f"+ {result['totalCount'] - 5} more results")

        await interaction.followup.send(embed=embed)

    @chronicle.command(name="stats", description="Show Chronicle statistics")
    @app_commands.describe(period="Time period")
    async def chronicle_stats(
        self,
        interaction: discord.Interaction,
        period: Optional[Literal["week", "month", "year", "all"]] = "all",
    ):
        """Show Chronicle statistics."""
        await interaction.response.defer()

        stats = await self._fetch(f"/stats?period={period}")

        if not stats:
            await interaction.followup.send("Failed to fetch statistics.")
            return

        embed = discord.Embed(
            title="Chronicle Statistics",
            description=f"Period: {period.title() if period != 'all' else 'All Time'}",
            color=0x6366F1,
            timestamp=datetime.utcnow(),
        )

        embed.add_field(name="Total Events", value=str(stats["totalEvents"]), inline=True)
        embed.add_field(name="Current Streak", value=f"{stats['streak']} days", inline=True)

        if stats.get("busiestDay"):
            embed.add_field(
                name="Busiest Day",
                value=f"{stats['busiestDay']['date']} ({stats['busiestDay']['count']} events)",
                inline=True,
            )

        # Category breakdown
        if stats.get("byCategory"):
            cat_text = "\n".join(
                [f"• {cat}: {count}" for cat, count in sorted(stats["byCategory"].items(), key=lambda x: -x[1])][:5]
            )
            embed.add_field(name="Top Categories", value=cat_text, inline=False)

        # Top tags
        if stats.get("topTags"):
            tags_text = ", ".join([t["tag"] for t in stats["topTags"][:10]])
            embed.add_field(name="Popular Tags", value=tags_text, inline=False)

        embed.set_footer(text="View full stats at chronicle.hrmsmrflrii.xyz/stats")
        await interaction.followup.send(embed=embed)

    @chronicle.command(name="on-this-day", description="See what happened on this day in history")
    async def chronicle_on_this_day(self, interaction: discord.Interaction):
        """Show events from this day in previous years."""
        await interaction.response.defer()

        result = await self._fetch("/on-this-day")

        if not result or result["totalEvents"] == 0:
            await interaction.followup.send(f"No events on {result['formattedDate']} in your homelab history.")
            return

        embed = discord.Embed(
            title=f"On This Day: {result['formattedDate']}",
            description=f"{result['totalEvents']} events across {result['yearCount']} years",
            color=0x6366F1,
        )

        for year, events in sorted(result["byYear"].items(), key=lambda x: -int(x[0])):
            event_list = "\n".join([f"• {e['title']}" for e in events[:3]])
            if len(events) > 3:
                event_list += f"\n• + {len(events) - 3} more"
            embed.add_field(name=year, value=event_list, inline=False)

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(Chronicle(bot))
