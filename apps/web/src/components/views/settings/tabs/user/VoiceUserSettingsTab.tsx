/*
Copyright 2024 New Vector Ltd.
Copyright 2020 The Matrix.org Foundation C.I.C.
Copyright 2019 New Vector Ltd

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type ChangeEventHandler, type JSX, type ReactNode, useCallback, useRef } from "react";

import { logger } from "matrix-js-sdk/src/logger";
import { FALLBACK_ICE_SERVER } from "matrix-js-sdk/src/webrtc/call";
import { type EmptyObject } from "matrix-js-sdk/src/matrix";
import { Form, SettingsToggleInput, Button, Text } from "@vector-im/compound-web";

import { _t } from "../../../../../languageHandler";
import MediaDeviceHandler, { type IMediaDevices, MediaDeviceKindEnum } from "../../../../../MediaDeviceHandler";
import Field from "../../../elements/Field";
import AccessibleButton from "../../../elements/AccessibleButton";
import { SettingLevel } from "../../../../../settings/SettingLevel";
import SettingsFlag from "../../../elements/SettingsFlag";
import { requestMediaPermissions } from "../../../../../utils/media/requestMediaPermissions";
import SettingsTab from "../SettingsTab";
import { SettingsSection } from "../../shared/SettingsSection";
import { SettingsSubsection } from "../../shared/SettingsSubsection";
import MatrixClientContext from "../../../../../contexts/MatrixClientContext";
import { usePTTKeybind } from "../../../../../hooks/usePTTKeybind";
import { useVoiceChannelMode } from "../../../../../hooks/useVoiceChannelMode";
import { VoiceAudioModeToggle } from "../../../rooms/VoiceAudioModeToggle";

const PTT_HTTP_PORT = 7700;

/**
 * HTTP PTT server instructions shown only inside the Electron app.
 * Users bind a key in their window manager (Sway, Hyprland, KDE, etc.)
 * or system (macOS, Windows) to POST to these endpoints globally.
 */
function PTTHttpServerInfo(): JSX.Element | null {
    if (!window.electron) return null;
    return (
        <SettingsSubsection heading="Global PTT — Window Manager / System" stretchContent>
            <Text as="p" size="sm">
                Nexus listens for PTT on a local HTTP server at port {PTT_HTTP_PORT}. Bind your PTT key
                in your window manager or system to call these endpoints — this works globally on Wayland,
                X11, macOS and Windows regardless of which window is focused.
            </Text>
            <div className="mx_PTTHttpServer">
                <Text as="p" size="sm">
                    <strong>Key pressed:</strong>{" "}
                    <code>curl -sf -X POST http://127.0.0.1:{PTT_HTTP_PORT}/ptt/down</code>
                </Text>
                <Text as="p" size="sm">
                    <strong>Key released:</strong>{" "}
                    <code>curl -sf -X POST http://127.0.0.1:{PTT_HTTP_PORT}/ptt/up</code>
                </Text>
            </div>
            <details>
                <summary>
                    <Text as="span" size="sm">
                        Example configurations
                    </Text>
                </summary>
                <Text as="p" size="sm">
                    <strong>Sway / i3</strong> (backtick key):
                </Text>
                <pre className="mx_PTTHttpServer_code">
                    {`bindsym --no-repeat grave exec curl -sf -X POST http://127.0.0.1:${PTT_HTTP_PORT}/ptt/down\nbindsym --release    grave exec curl -sf -X POST http://127.0.0.1:${PTT_HTTP_PORT}/ptt/up`}
                </pre>
                <Text as="p" size="sm">
                    <strong>Hyprland</strong>:
                </Text>
                <pre className="mx_PTTHttpServer_code">
                    {`bind  = , grave, exec, curl -sf -X POST http://127.0.0.1:${PTT_HTTP_PORT}/ptt/down\nbindr = , grave, exec, curl -sf -X POST http://127.0.0.1:${PTT_HTTP_PORT}/ptt/up`}
                </pre>
                <Text as="p" size="sm">
                    <strong>Windows — AutoHotkey v2</strong>:
                </Text>
                <pre className="mx_PTTHttpServer_code">
                    {`\`\`:: {\n  Loop {\n    if !GetKeyState("\`\`", "P") {\n      Run "curl -sf -X POST http://127.0.0.1:${PTT_HTTP_PORT}/ptt/up",,"Hide"\n      break\n    }\n    if A_Index = 1\n      Run "curl -sf -X POST http://127.0.0.1:${PTT_HTTP_PORT}/ptt/down",,"Hide"\n    Sleep 50\n  }\n}`}
                </pre>
                <Text as="p" size="sm">
                    <strong>macOS — shell script</strong> (bind in System Settings → Keyboard Shortcuts):
                </Text>
                <pre className="mx_PTTHttpServer_code">
                    {`# on key down:\ncurl -sf -X POST http://127.0.0.1:${PTT_HTTP_PORT}/ptt/down\n# on key up:\ncurl -sf -X POST http://127.0.0.1:${PTT_HTTP_PORT}/ptt/up`}
                </pre>
            </details>
        </SettingsSubsection>
    );
}

/**
 * PTT keybind capture widget + default voice mode selector.
 * Rendered as a sub-section inside VoiceUserSettingsTab.
 */
function PTTSettings(): JSX.Element {
    const { keybind, isCapturing, startCapture, cancelCapture } = usePTTKeybind();
    const [voiceMode, setVoiceMode] = useVoiceChannelMode();
    const captureRef = useRef<HTMLButtonElement | null>(null);

    const handleCaptureClick = useCallback(() => {
        if (isCapturing) {
            cancelCapture();
        } else {
            startCapture();
            captureRef.current?.focus();
        }
    }, [isCapturing, startCapture, cancelCapture]);

    return (
        <SettingsSubsection heading={_t("settings|voip|ptt_section")} stretchContent>
            <div className="mx_PTTSettings">
                <Text as="p" size="sm">
                    {_t("settings|voip|ptt_keybind_label")}
                </Text>
                <div className="mx_PTTSettings_keybind">
                    <span className="mx_PTTSettings_keybindKey">
                        {isCapturing ? _t("settings|voip|ptt_press_any_key") : keybind}
                    </span>
                    <Button
                        ref={captureRef}
                        size="sm"
                        kind={isCapturing ? "destructive" : "secondary"}
                        onClick={handleCaptureClick}
                    >
                        {isCapturing ? _t("action|cancel") : _t("settings|voip|ptt_change_keybind")}
                    </Button>
                </div>
                <Text as="p" size="sm">
                    {_t("settings|voip|ptt_default_mode_label")}
                </Text>
                <VoiceAudioModeToggle mode={voiceMode} onChange={setVoiceMode} />
            </div>
        </SettingsSubsection>
    );
}

interface IState {
    mediaDevices: IMediaDevices | null;
    [MediaDeviceKindEnum.AudioOutput]: string | null;
    [MediaDeviceKindEnum.AudioInput]: string | null;
    [MediaDeviceKindEnum.VideoInput]: string | null;
    audioAutoGainControl: boolean;
    audioEchoCancellation: boolean;
    audioNoiseSuppression: boolean;
}

/**
 * Maps deviceKind to the right get method on MediaDeviceHandler
 * Helpful for setting state
 */
const mapDeviceKindToHandlerValue = (deviceKind: MediaDeviceKindEnum): string | null => {
    switch (deviceKind) {
        case MediaDeviceKindEnum.AudioOutput:
            return MediaDeviceHandler.getAudioOutput();
        case MediaDeviceKindEnum.AudioInput:
            return MediaDeviceHandler.getAudioInput();
        case MediaDeviceKindEnum.VideoInput:
            return MediaDeviceHandler.getVideoInput();
    }
};

export default class VoiceUserSettingsTab extends React.Component<EmptyObject, IState> {
    public static contextType = MatrixClientContext;
    declare public context: React.ContextType<typeof MatrixClientContext>;

    public constructor(props: EmptyObject) {
        super(props);

        this.state = {
            mediaDevices: null,
            [MediaDeviceKindEnum.AudioOutput]: null,
            [MediaDeviceKindEnum.AudioInput]: null,
            [MediaDeviceKindEnum.VideoInput]: null,
            audioAutoGainControl: MediaDeviceHandler.getAudioAutoGainControl(),
            audioEchoCancellation: MediaDeviceHandler.getAudioEchoCancellation(),
            audioNoiseSuppression: MediaDeviceHandler.getAudioNoiseSuppression(),
        };
    }

    public async componentDidMount(): Promise<void> {
        const canSeeDeviceLabels = await MediaDeviceHandler.hasAnyLabeledDevices();
        if (canSeeDeviceLabels) {
            await this.refreshMediaDevices();
        }
    }

    private refreshMediaDevices = async (stream?: MediaStream): Promise<void> => {
        this.setState({
            mediaDevices: (await MediaDeviceHandler.getDevices()) ?? null,
            [MediaDeviceKindEnum.AudioOutput]: mapDeviceKindToHandlerValue(MediaDeviceKindEnum.AudioOutput),
            [MediaDeviceKindEnum.AudioInput]: mapDeviceKindToHandlerValue(MediaDeviceKindEnum.AudioInput),
            [MediaDeviceKindEnum.VideoInput]: mapDeviceKindToHandlerValue(MediaDeviceKindEnum.VideoInput),
        });
        if (stream) {
            // kill stream (after we've enumerated the devices, otherwise we'd get empty labels again)
            // so that we don't leave it lingering around with webcam enabled etc
            // as here we called gUM to ask user for permission to their device names only
            stream.getTracks().forEach((track) => track.stop());
        }
    };

    private requestMediaPermissions = async (): Promise<void> => {
        const stream = await requestMediaPermissions();
        if (stream) {
            await this.refreshMediaDevices(stream);
        }
    };

    private setDevice = async (deviceId: string, kind: MediaDeviceKindEnum): Promise<void> => {
        // set state immediately so UI is responsive
        this.setState<any>({ [kind]: deviceId });
        try {
            await MediaDeviceHandler.instance.setDevice(deviceId, kind);
        } catch {
            logger.error(`Failed to set device ${kind}: ${deviceId}`);
            // reset state to current value
            this.setState<any>({ [kind]: mapDeviceKindToHandlerValue(kind) });
        }
    };

    private changeWebRtcMethod = (p2p: boolean): void => {
        this.context.setForceTURN(!p2p);
    };

    private renderDeviceOptions(devices: Array<MediaDeviceInfo>, category: MediaDeviceKindEnum): Array<JSX.Element> {
        return devices.map((d) => {
            return (
                <option key={`${category}-${d.deviceId}`} value={d.deviceId}>
                    {d.label}
                </option>
            );
        });
    }

    private renderDropdown(kind: MediaDeviceKindEnum, label: string): ReactNode {
        const devices = this.state.mediaDevices?.[kind].slice(0);
        if (!devices?.length) return null;

        const defaultDevice = MediaDeviceHandler.getDefaultDevice(devices);
        return (
            <Field
                element="select"
                label={label}
                value={this.state[kind] || defaultDevice}
                onChange={(e) => this.setDevice(e.target.value, kind)}
            >
                {this.renderDeviceOptions(devices, kind)}
            </Field>
        );
    }

    private onAutoGainChanged: ChangeEventHandler<HTMLInputElement> = async (event) => {
        const enable = event.target.checked;
        await MediaDeviceHandler.setAudioAutoGainControl(enable);
        this.setState({ audioAutoGainControl: MediaDeviceHandler.getAudioAutoGainControl() });
    };

    private onNoiseSuppressionChanged: ChangeEventHandler<HTMLInputElement> = async (event) => {
        const enable = event.target.checked;
        await MediaDeviceHandler.setAudioNoiseSuppression(enable);
        this.setState({ audioNoiseSuppression: MediaDeviceHandler.getAudioNoiseSuppression() });
    };

    private onEchoCancellationChanged: ChangeEventHandler<HTMLInputElement> = async (event) => {
        const enable = event.target.checked;
        await MediaDeviceHandler.setAudioEchoCancellation(enable);
        this.setState({ audioEchoCancellation: MediaDeviceHandler.getAudioEchoCancellation() });
    };

    public render(): ReactNode {
        let requestButton: ReactNode | undefined;
        let speakerDropdown: ReactNode | undefined;
        let microphoneDropdown: ReactNode | undefined;
        let webcamDropdown: ReactNode | undefined;
        if (!this.state.mediaDevices) {
            requestButton = (
                <div>
                    <p>{_t("settings|voip|missing_permissions_prompt")}</p>
                    <AccessibleButton onClick={this.requestMediaPermissions} kind="primary">
                        {_t("settings|voip|request_permissions")}
                    </AccessibleButton>
                </div>
            );
        } else if (this.state.mediaDevices) {
            speakerDropdown = this.renderDropdown(
                MediaDeviceKindEnum.AudioOutput,
                _t("settings|voip|audio_output"),
            ) || <p>{_t("settings|voip|audio_output_empty")}</p>;
            microphoneDropdown = this.renderDropdown(MediaDeviceKindEnum.AudioInput, _t("common|microphone")) || (
                <p>{_t("settings|voip|audio_input_empty")}</p>
            );
            webcamDropdown = this.renderDropdown(MediaDeviceKindEnum.VideoInput, _t("common|camera")) || (
                <p>{_t("settings|voip|video_input_empty")}</p>
            );
        }

        return (
            <SettingsTab>
                <Form.Root
                    onSubmit={(evt) => {
                        evt.preventDefault();
                        evt.stopPropagation();
                    }}
                >
                    <SettingsSection>
                        {requestButton}
                        <SettingsSubsection heading={_t("settings|voip|voice_section")} stretchContent>
                            {speakerDropdown}
                            {microphoneDropdown}
                            <SettingsToggleInput
                                name="voice-auto-gain"
                                label={_t("settings|voip|voice_agc")}
                                checked={this.state.audioAutoGainControl}
                                onChange={this.onAutoGainChanged}
                            />
                        </SettingsSubsection>
                        <SettingsSubsection heading={_t("settings|voip|video_section")} stretchContent>
                            {webcamDropdown}
                            <SettingsFlag name="VideoView.flipVideoHorizontally" level={SettingLevel.ACCOUNT} />
                        </SettingsSubsection>
                    </SettingsSection>

                    <SettingsSection heading={_t("settings|voip|ptt_section")}>
                        <PTTSettings />
                        <PTTHttpServerInfo />
                    </SettingsSection>

                    <SettingsSection heading={_t("common|advanced")}>
                        <SettingsSubsection heading={_t("settings|voip|voice_processing")}>
                            <SettingsToggleInput
                                name="voice-noise-suppression"
                                label={_t("settings|voip|noise_suppression")}
                                helpMessage={_t("settings|voip|noise_suppression_description")}
                                checked={this.state.audioNoiseSuppression}
                                onChange={this.onNoiseSuppressionChanged}
                            />
                            <SettingsToggleInput
                                name="voice-echo-cancellation"
                                label={_t("settings|voip|echo_cancellation")}
                                helpMessage={_t("settings|voip|echo_cancellation_description")}
                                checked={this.state.audioEchoCancellation}
                                onChange={this.onEchoCancellationChanged}
                            />
                        </SettingsSubsection>
                        <SettingsSubsection heading={_t("settings|voip|connection_section")}>
                            <SettingsFlag
                                name="webRtcAllowPeerToPeer"
                                level={SettingLevel.DEVICE}
                                onChange={this.changeWebRtcMethod}
                            />
                            <SettingsFlag
                                name="fallbackICEServerAllowed"
                                label={_t("settings|voip|enable_fallback_ice_server", {
                                    server: new URL(FALLBACK_ICE_SERVER).pathname,
                                })}
                                level={SettingLevel.DEVICE}
                                hideIfCannotSet
                            />
                        </SettingsSubsection>
                    </SettingsSection>
                </Form.Root>
            </SettingsTab>
        );
    }
}
