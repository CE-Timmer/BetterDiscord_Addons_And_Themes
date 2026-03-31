/**
 * @name GlobalServerNotifications
 * @description Create one global server notification preset, choose which servers should use it, and apply it in one go.
 * @version 0.1.0
 * @author Codex
 * @website https://betterdiscord.app/
 * @source https://betterdiscord.app/
 */

"use strict";

const config = {
    info: {
        name: "GlobalServerNotifications",
        version: "0.1.0",
        description: "Create one global server notification preset, choose which servers should use it, and apply it in one go."
    }
};

const defaultSettings = {
    preset: {
        muted: false,
        message_notifications: 1,
        notify_highlights: 2,
        suppress_everyone: false,
        suppress_roles: false,
        mobile_push: true,
        mute_scheduled_events: false
    },
    selectedGuilds: {},
    autoApplyOnStartup: false
};

module.exports = class GlobalServerNotifications {
    constructor() {
        this.settings = this.loadSettings();
        this.styleId = config.info.name;
    }

    start() {
        this.addStyles();
        this.settings = this.loadSettings();

        if (this.settings.autoApplyOnStartup) {
            this.applyPresetToSelectedGuilds(false);
        }
    }

    stop() {
        BdApi.DOM.removeStyle(this.styleId);
    }

    loadSettings() {
        const stored = BdApi.Data.load(config.info.name, "settings") ?? {};
        return {
            ...defaultSettings,
            ...stored,
            preset: {
                ...defaultSettings.preset,
                ...(stored.preset ?? {})
            },
            selectedGuilds: {
                ...defaultSettings.selectedGuilds,
                ...(stored.selectedGuilds ?? {})
            }
        };
    }

    saveSettings() {
        BdApi.Data.save(config.info.name, "settings", this.settings);
    }

    getGuildStore() {
        return BdApi.Webpack.getStore("GuildStore");
    }

    getSelectedGuildStore() {
        return BdApi.Webpack.getStore("SelectedGuildStore");
    }

    getNotificationActions() {
        return BdApi.Webpack.getByKeys("updateGuildNotificationSettings");
    }

    getGuilds() {
        const GuildStore = this.getGuildStore();
        if (!GuildStore?.getGuilds) {
            return [];
        }

        return Object.values(GuildStore.getGuilds())
            .filter(guild => guild && guild.id && guild.name)
            .sort((left, right) => left.name.localeCompare(right.name));
    }

    getSelectedGuildIds() {
        return Object.entries(this.settings.selectedGuilds)
            .filter(([, enabled]) => enabled)
            .map(([guildId]) => guildId);
    }

    getPresetPayload() {
        return {
            muted: this.settings.preset.muted,
            message_notifications: Number(this.settings.preset.message_notifications),
            notify_highlights: Number(this.settings.preset.notify_highlights),
            suppress_everyone: this.settings.preset.suppress_everyone,
            suppress_roles: this.settings.preset.suppress_roles,
            mobile_push: this.settings.preset.mobile_push,
            mute_scheduled_events: this.settings.preset.mute_scheduled_events
        };
    }

    applyPresetToGuild(guildId) {
        const NotificationActions = this.getNotificationActions();
        if (!NotificationActions?.updateGuildNotificationSettings) {
            throw new Error("Discord notification actions module was not found.");
        }

        NotificationActions.updateGuildNotificationSettings(guildId, this.getPresetPayload());
    }

    applyPresetToSelectedGuilds(showToast = true) {
        const selectedGuildIds = this.getSelectedGuildIds();
        if (!selectedGuildIds.length) {
            if (showToast) {
                BdApi.UI.showToast("Select at least one server first.", {type: "warning"});
            }
            return;
        }

        try {
            for (const guildId of selectedGuildIds) {
                this.applyPresetToGuild(guildId);
            }

            if (showToast) {
                BdApi.UI.showToast(`Applied the preset to ${selectedGuildIds.length} server${selectedGuildIds.length === 1 ? "" : "s"}.`, {type: "success"});
            }
        }
        catch (error) {
            BdApi.Logger.error(config.info.name, "Failed to apply notification preset.", error);
            if (showToast) {
                BdApi.UI.showToast("Could not apply the notification preset. Check the console for details.", {type: "error"});
            }
        }
    }

    addStyles() {
        BdApi.DOM.addStyle(this.styleId, `
            .gsn-panel {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            .gsn-section {
                padding: 16px;
                border-radius: 12px;
                background: var(--background-secondary);
                border: 1px solid var(--background-modifier-accent);
            }

            .gsn-section h3 {
                margin: 0 0 6px;
                font-size: 16px;
                font-weight: 700;
                color: var(--header-primary);
            }

            .gsn-section p {
                margin: 0;
                color: var(--text-muted);
                line-height: 1.5;
            }

            .gsn-settings {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
                gap: 12px;
                margin-top: 16px;
            }

            .gsn-field {
                display: flex;
                flex-direction: column;
                gap: 6px;
                padding: 12px;
                border-radius: 10px;
                background: var(--background-primary);
            }

            .gsn-field-label {
                font-weight: 600;
                color: var(--header-primary);
            }

            .gsn-field-note {
                font-size: 12px;
                color: var(--text-muted);
                line-height: 1.4;
            }

            .gsn-field input[type="text"],
            .gsn-field select {
                min-height: 36px;
                border: none;
                border-radius: 8px;
                padding: 0 10px;
                color: var(--text-normal);
                background: var(--input-background);
            }

            .gsn-toggle {
                display: flex;
                align-items: center;
                gap: 10px;
                min-height: 36px;
                color: var(--text-normal);
            }

            .gsn-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 16px;
            }

            .gsn-toolbar button {
                min-height: 34px;
                border: none;
                border-radius: 8px;
                padding: 0 14px;
                cursor: pointer;
                color: var(--white-500);
                background: var(--button-secondary-background);
            }

            .gsn-toolbar button.gsn-primary {
                background: var(--button-positive-background);
            }

            .gsn-toolbar button:hover {
                filter: brightness(1.08);
            }

            .gsn-search {
                width: 100%;
                min-height: 38px;
                margin-top: 16px;
                border: none;
                border-radius: 8px;
                padding: 0 12px;
                color: var(--text-normal);
                background: var(--input-background);
            }

            .gsn-server-list {
                display: grid;
                gap: 8px;
                max-height: 380px;
                margin-top: 14px;
                padding-right: 4px;
                overflow: auto;
            }

            .gsn-server-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 12px;
                border-radius: 10px;
                background: var(--background-primary);
            }

            .gsn-server-row label {
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 0;
                color: var(--text-normal);
            }

            .gsn-server-name {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .gsn-server-id {
                flex-shrink: 0;
                font-size: 11px;
                color: var(--text-muted);
            }

            .gsn-empty {
                padding: 18px 12px;
                border-radius: 10px;
                text-align: center;
                color: var(--text-muted);
                background: var(--background-primary);
            }
        `);
    }

    createSection(title, description) {
        const section = document.createElement("section");
        section.className = "gsn-section";

        const heading = document.createElement("h3");
        heading.textContent = title;

        const text = document.createElement("p");
        text.textContent = description;

        section.append(heading, text);
        return section;
    }

    createField({label, note, input}) {
        const wrapper = document.createElement("div");
        wrapper.className = "gsn-field";

        const title = document.createElement("div");
        title.className = "gsn-field-label";
        title.textContent = label;

        wrapper.appendChild(title);

        if (note) {
            const description = document.createElement("div");
            description.className = "gsn-field-note";
            description.textContent = note;
            wrapper.appendChild(description);
        }

        wrapper.appendChild(input);
        return wrapper;
    }

    createToggle(checked, onChange, labelText) {
        const label = document.createElement("label");
        label.className = "gsn-toggle";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = checked;
        input.addEventListener("change", () => onChange(input.checked));

        const text = document.createElement("span");
        text.textContent = labelText;

        label.append(input, text);
        return label;
    }

    createSelect(value, options, onChange) {
        const select = document.createElement("select");

        for (const optionData of options) {
            const option = document.createElement("option");
            option.value = String(optionData.value);
            option.textContent = optionData.label;
            if (String(optionData.value) === String(value)) {
                option.selected = true;
            }
            select.appendChild(option);
        }

        select.addEventListener("change", () => onChange(select.value));
        return select;
    }

    buildPresetSection() {
        const section = this.createSection(
            "Global Preset",
            "These values are reused for every server you select below. Channel-specific overrides are left alone."
        );

        const settingsGrid = document.createElement("div");
        settingsGrid.className = "gsn-settings";

        settingsGrid.appendChild(this.createField({
            label: "Server Notifications",
            note: "Choose the server-wide message notification level.",
            input: this.createSelect(this.settings.preset.message_notifications, [
                {label: "All Messages", value: 0},
                {label: "Only Mentions", value: 1},
                {label: "Nothing", value: 2}
            ], value => {
                this.settings.preset.message_notifications = Number(value);
                this.saveSettings();
            })
        }));

        settingsGrid.appendChild(this.createField({
            label: "Highlights",
            note: "Control whether Discord highlight notifications are included.",
            input: this.createSelect(this.settings.preset.notify_highlights, [
                {label: "Off", value: 1},
                {label: "On", value: 2}
            ], value => {
                this.settings.preset.notify_highlights = Number(value);
                this.saveSettings();
            })
        }));

        settingsGrid.appendChild(this.createField({
            label: "Mute Server",
            note: "Mute the whole server as part of the preset.",
            input: this.createToggle(this.settings.preset.muted, value => {
                this.settings.preset.muted = value;
                this.saveSettings();
            }, "Enabled")
        }));

        settingsGrid.appendChild(this.createField({
            label: "Suppress @everyone / @here",
            note: "Hide notifications from global mentions in selected servers.",
            input: this.createToggle(this.settings.preset.suppress_everyone, value => {
                this.settings.preset.suppress_everyone = value;
                this.saveSettings();
            }, "Enabled")
        }));

        settingsGrid.appendChild(this.createField({
            label: "Suppress Role Mentions",
            note: "Hide notifications from all role mentions in selected servers.",
            input: this.createToggle(this.settings.preset.suppress_roles, value => {
                this.settings.preset.suppress_roles = value;
                this.saveSettings();
            }, "Enabled")
        }));

        settingsGrid.appendChild(this.createField({
            label: "Mobile Push Notifications",
            note: "Enable or disable mobile push for the selected servers.",
            input: this.createToggle(this.settings.preset.mobile_push, value => {
                this.settings.preset.mobile_push = value;
                this.saveSettings();
            }, "Enabled")
        }));

        settingsGrid.appendChild(this.createField({
            label: "Mute Scheduled Events",
            note: "Silence new event notifications in the selected servers.",
            input: this.createToggle(this.settings.preset.mute_scheduled_events, value => {
                this.settings.preset.mute_scheduled_events = value;
                this.saveSettings();
            }, "Enabled")
        }));

        settingsGrid.appendChild(this.createField({
            label: "Apply On Startup",
            note: "Re-apply the preset to all selected servers when Discord starts.",
            input: this.createToggle(this.settings.autoApplyOnStartup, value => {
                this.settings.autoApplyOnStartup = value;
                this.saveSettings();
            }, "Enabled")
        }));

        section.appendChild(settingsGrid);
        return section;
    }

    buildServerSection() {
        const section = this.createSection(
            "Server Picker",
            "Pick the servers that should use the global preset, then apply it whenever you want."
        );

        const countText = document.createElement("p");
        countText.style.marginTop = "12px";

        const updateCountText = () => {
            const total = this.getGuilds().length;
            const selected = this.getSelectedGuildIds().length;
            countText.textContent = `${selected} of ${total} servers selected.`;
        };

        const toolbar = document.createElement("div");
        toolbar.className = "gsn-toolbar";

        const applyButton = document.createElement("button");
        applyButton.className = "gsn-primary";
        applyButton.textContent = "Apply Preset To Selected Servers";
        applyButton.addEventListener("click", () => this.applyPresetToSelectedGuilds(true));

        const selectAllButton = document.createElement("button");
        selectAllButton.textContent = "Select All";
        selectAllButton.addEventListener("click", () => {
            for (const guild of this.getGuilds()) {
                this.settings.selectedGuilds[guild.id] = true;
            }
            this.saveSettings();
            refreshServerList();
        });

        const clearButton = document.createElement("button");
        clearButton.textContent = "Clear Selection";
        clearButton.addEventListener("click", () => {
            this.settings.selectedGuilds = {};
            this.saveSettings();
            refreshServerList();
        });

        const currentButton = document.createElement("button");
        currentButton.textContent = "Select Current Server";
        currentButton.addEventListener("click", () => {
            const guildId = this.getSelectedGuildStore()?.getGuildId?.();
            if (!guildId) {
                BdApi.UI.showToast("Open a server first, then try again.", {type: "warning"});
                return;
            }

            this.settings.selectedGuilds[guildId] = true;
            this.saveSettings();
            refreshServerList();
        });

        toolbar.append(applyButton, selectAllButton, clearButton, currentButton);

        const search = document.createElement("input");
        search.className = "gsn-search";
        search.type = "text";
        search.placeholder = "Search servers by name...";

        const list = document.createElement("div");
        list.className = "gsn-server-list";

        const refreshServerList = () => {
            const searchValue = search.value.trim().toLowerCase();
            const guilds = this.getGuilds().filter(guild => guild.name.toLowerCase().includes(searchValue));

            list.replaceChildren();

            if (!guilds.length) {
                const empty = document.createElement("div");
                empty.className = "gsn-empty";
                empty.textContent = "No servers match this search.";
                list.appendChild(empty);
            }
            else {
                for (const guild of guilds) {
                    const row = document.createElement("div");
                    row.className = "gsn-server-row";

                    const label = document.createElement("label");

                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.checked = Boolean(this.settings.selectedGuilds[guild.id]);
                    checkbox.addEventListener("change", () => {
                        if (checkbox.checked) {
                            this.settings.selectedGuilds[guild.id] = true;
                        }
                        else {
                            delete this.settings.selectedGuilds[guild.id];
                        }

                        this.saveSettings();
                        updateCountText();
                    });

                    const name = document.createElement("span");
                    name.className = "gsn-server-name";
                    name.textContent = guild.name;

                    const guildId = document.createElement("span");
                    guildId.className = "gsn-server-id";
                    guildId.textContent = guild.id;

                    label.append(checkbox, name);
                    row.append(label, guildId);
                    list.appendChild(row);
                }
            }

            updateCountText();
        };

        search.addEventListener("input", refreshServerList);
        refreshServerList();

        section.append(countText, toolbar, search, list);
        return section;
    }

    getSettingsPanel() {
        const panel = document.createElement("div");
        panel.className = "gsn-panel";

        const intro = this.createSection(
            "How It Works",
            "Set one reusable notification preset, pick the servers that should use it, then press apply. This changes Discord's normal server notification settings for those servers."
        );

        panel.append(intro, this.buildPresetSection(), this.buildServerSection());
        return panel;
    }
};
