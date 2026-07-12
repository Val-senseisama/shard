import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { hud, FONT, SHARD_GRADIENT } from './tokens';

export { hud, FONT, SHARD_GRADIENT, REFRACT_GRADIENT } from './tokens';
export type { HudPalette } from './tokens';

/** Mono UPPERCASE eyebrow/label — the HUD utility voice. */
export const HudLabel = ({
  children,
  color,
  size = 10,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  size?: number;
  style?: StyleProp<TextStyle>;
}) => (
  <Text
    style={[
      { fontFamily: FONT.mono, fontSize: size, letterSpacing: 1.8, textTransform: 'uppercase', color: color ?? '#8E8CA0' },
      style,
    ]}>
    {children}
  </Text>
);

/** Mono value text — stats, XP, counts, codes. */
export const Mono = ({
  children,
  color,
  size = 12,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  size?: number;
  style?: StyleProp<TextStyle>;
}) => (
  <Text style={[{ fontFamily: FONT.mono, fontSize: size, letterSpacing: 0.5, color: color ?? '#F3F2F8' }, style]}>
    {children}
  </Text>
);

/** HUD targeting/registration corner marks — the signature. */
export const CornerBrackets = ({ color, size = 12, inset = 6 }: { color: string; size?: number; inset?: number }) => {
  const arm = 1.5;
  const base: ViewStyle = { position: 'absolute', width: size, height: size, borderColor: color };
  return (
    <>
      <View pointerEvents="none" style={[base, { top: inset, left: inset, borderTopWidth: arm, borderLeftWidth: arm }]} />
      <View pointerEvents="none" style={[base, { top: inset, right: inset, borderTopWidth: arm, borderRightWidth: arm }]} />
      <View pointerEvents="none" style={[base, { bottom: inset, left: inset, borderBottomWidth: arm, borderLeftWidth: arm }]} />
      <View pointerEvents="none" style={[base, { bottom: inset, right: inset, borderBottomWidth: arm, borderRightWidth: arm }]} />
    </>
  );
};

/**
 * Cut-obsidian panel: crisp geometry, hairline facet border, optional top accent
 * edge and HUD corner brackets. The building block for every card in the app.
 */
export const FacetPanel = ({
  children,
  isDark,
  brackets = false,
  accentEdge = false,
  bracketColor,
  style,
}: {
  children: React.ReactNode;
  isDark: boolean;
  brackets?: boolean;
  accentEdge?: boolean;
  bracketColor?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const c = hud(isDark);
  return (
    <View
      style={[
        {
          backgroundColor: c.panel,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: c.panelBorder,
          overflow: 'hidden',
        },
        style,
      ]}>
      {accentEdge && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: c.violet, opacity: 0.9 }} />
      )}
      {children}
      {brackets && <CornerBrackets color={bracketColor ?? c.panelBorderStrong} />}
    </View>
  );
};

/** Angular crystal progress bar — crisp track, violet→cyan fill, bright leading cap. */
export const ShardBar = ({
  progress,
  isDark,
  height = 8,
  style,
}: {
  progress: number; // 0..1
  isDark: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) => {
  const c = hud(isDark);
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={[{ height, backgroundColor: c.track, borderRadius: 2, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={[c.violet, c.cyan]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct * 100}%`, borderRadius: 2 }}
      />
      {pct > 0.02 && pct < 0.99 && (
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct * 100}%`, width: 2, backgroundColor: c.cyan, marginLeft: -2 }} />
      )}
    </View>
  );
};

/** HUD text field — mono uppercase label, crisp obsidian input, violet focus edge. */
export const HudField = ({
  label,
  value,
  onChange,
  placeholder,
  isPassword,
  isDark = true,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  isPassword?: boolean;
  isDark?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
}) => {
  const c = hud(isDark);
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <HudLabel color={focused ? c.violet : c.textDim} style={{ marginBottom: 7 }}>
        {label}
      </HudLabel>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: c.bgElev,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: focused ? c.violet : c.panelBorder,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={c.textFaint}
          secureTextEntry={isPassword && !show}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'none'}
          autoCorrect={false}
          style={{ flex: 1, fontSize: 15, fontFamily: FONT.regular, color: c.text }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShow((s) => !s)} hitSlop={12}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.textDim} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

/** The SH▲RD wordmark. */
export const WordMark = ({ size = 26, color, accent }: { size?: number; color?: string; accent?: string }) => (
  <Text style={{ fontFamily: FONT.black, fontSize: size, letterSpacing: size * 0.14, color: color ?? '#F3F2F8' }}>
    SH<Text style={{ color: accent ?? '#8B5CF6' }}>▲</Text>RD
  </Text>
);
