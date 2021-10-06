import {
	ApplicationCommand,
	ApplicationCommandOption,
	ApplicationCommandOptionType,
	DiscordInteractions,
	PartialApplicationCommand,
} from "slash-commands"

export interface SlashOpts {
	clientId: string
	guildId: string
	token: string
	puclicKey: string
}

export async function registerInteractions(opts: SlashOpts): Promise<void> {
	const cmdAdd: ApplicationCommandOption = {
		name: "add",
		description: "add rss feed to channel",
		type: ApplicationCommandOptionType.SUB_COMMAND,
		options: [
			{
				name: "name",
				description: "name for the rss feed",
				type: ApplicationCommandOptionType.STRING,
				required: true,
			},
			{
				name: "url",
				description: "rss feed's url",
				type: ApplicationCommandOptionType.STRING,
			},
		],
	}

	const cmdRem: ApplicationCommandOption = {
		name: "rem",
		description: "remove rss feed from channel",
		type: ApplicationCommandOptionType.SUB_COMMAND,
		options: [
			{
				name: "name",
				description: "name of the rss feed",
				type: ApplicationCommandOptionType.STRING,
				required: true,
			},
		],
	}

	const cmdList: ApplicationCommandOption = {
		name: "list",
		description: "list all feeds in this channel",
		type: ApplicationCommandOptionType.SUB_COMMAND,
	}

	const cmdFetch: ApplicationCommandOption = {
		name: "fetch",
		description: "fetch new content from feeds in this channel",
		type: ApplicationCommandOptionType.SUB_COMMAND,
	}

	const cmdFetchAll: ApplicationCommandOption = {
		name: "fetchall",
		description: "fetch from all feeds",
		type: ApplicationCommandOptionType.SUB_COMMAND,
	}

	const cmdSave: ApplicationCommandOption = {
		name: "save",
		description: "save feed history",
		type: ApplicationCommandOptionType.SUB_COMMAND,
	}

	const cmdPrune: ApplicationCommandOption = {
		name: "prune",
		description: "remove old content from feed history",
		type: ApplicationCommandOptionType.SUB_COMMAND,
	}

	const cmd1: PartialApplicationCommand = {
		name: "rss",
		description: "rss feed commands",
		options: [
			cmdAdd,
			cmdRem,
			cmdList,
			cmdFetch,
			cmdFetchAll,
			cmdSave,
			cmdPrune,
		],
	}

	const cmdAddCustom: ApplicationCommandOption = {
		name: "add",
		description: "add custom feed to channel",
		type: ApplicationCommandOptionType.SUB_COMMAND,
		options: [
			{
				name: "name",
				description: "name for the rss feed",
				type: ApplicationCommandOptionType.STRING,
				required: true,
			},
		],
	}

	const cmdRemCustom: ApplicationCommandOption = {
		name: "rem",
		description: "remove custom feed from channel",
		type: ApplicationCommandOptionType.SUB_COMMAND,
		options: [
			{
				name: "name",
				description: "name of the rss feed to remove",
				type: ApplicationCommandOptionType.STRING,
				required: true,
			},
		],
	}

	const cmd2: PartialApplicationCommand = {
		name: "feed",
		description: "custom feed commands",
		options: [cmdAddCustom, cmdRemCustom],
	}

	const interaction = new DiscordInteractions({
		applicationId: opts.clientId,
		authToken: opts.token,
		publicKey: opts.puclicKey,
	})

	console.log(await interaction.createApplicationCommand(cmd1, opts.guildId))
	console.log(await interaction.createApplicationCommand(cmd2, opts.guildId))
}

export async function deleteInteractions(
	cmdId: string,
	opts: SlashOpts
): Promise<void> {
	const interaction = new DiscordInteractions({
		applicationId: opts.clientId,
		authToken: opts.token,
		publicKey: opts.puclicKey,
	})

	console.log(await interaction.deleteApplicationCommand(cmdId, opts.guildId))
}

export function getApplicationCommands(
	opts: SlashOpts
): Promise<ApplicationCommand[]> {
	const interaction = new DiscordInteractions({
		applicationId: opts.clientId,
		authToken: opts.token,
		publicKey: opts.puclicKey,
	})
	return interaction.getApplicationCommands(opts.guildId)
}
