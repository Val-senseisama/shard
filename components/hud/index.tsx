import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import AnimatedPressable from '../AnimatedPressable';
import { hud, FONT, RADIUS, SHARD_GRADIENT } from './tokens';

export { hud, FONT, RADIUS, TYPE, SHARD_GRADIENT, REFRACT_GRADIENT } from './tokens';
export type { HudPalette } from './tokens';

/**
 * Section eyebrow / field label. Sentence case, near-zero tracking — words are
 * Inter, never mono. See "the mono rule" in tokens.ts.
 */
export const HudLabel = ({
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
  <Text style={[{ fontFamily: FONT.semibold, fontSize: size, letterSpacing: 0.2, color: color ?? '#8E8CA0' }, style]}>
    {children}
  </Text>
);

/**
 * Numeral text — XP, %, counts, rank, levels. Tabular figures so values don't
 * jitter as they tick up. This is the ONLY place SpaceMono is allowed.
 */
export const Num = ({
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
  <Text
    style={[
      { fontFamily: FONT.mono, fontSize: size, letterSpacing: 0.5, fontVariant: ['tabular-nums'], color: color ?? '#F3F2F8' },
      style,
    ]}>
    {children}
  </Text>
);

/** @deprecated Use `Num` — it says what it's for. Same component. */
export const Mono = Num;

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_SIZES: Record<ButtonSize, { height: number; fontSize: number; paddingHorizontal: number }> = {
  sm: { height: 34, fontSize: 13, paddingHorizontal: 14 },
  md: { height: 44, fontSize: 14, paddingHorizontal: 18 },
  lg: { height: 52, fontSize: 15, paddingHorizontal: 24 },
};

/**
 * The one button. Sentence case, no letter-spacing — a button that SHOUTS
 * "FORGE QUEST" in tracked-out mono is the single loudest robotic tell.
 */
export const HudButton = ({
  label,
  onPress,
  isDark = true,
  variant = 'primary',
  size = 'lg',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: {
  label: string;
  onPress: () => void;
  isDark?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}) => {
  const c = hud(isDark);
  const s = BUTTON_SIZES[size];
  const isDisabled = disabled || loading;

  const fg =
    variant === 'primary' ? '#fff' : variant === 'danger' ? c.danger : variant === 'ghost' ? c.textDim : c.text;

  const body = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={s.fontSize + 3} color={fg} style={{ marginRight: 8 }} />}
          <Text style={{ fontFamily: FONT.bold, fontSize: s.fontSize, letterSpacing: 0, color: fg }}>{label}</Text>
        </>
      )}
    </>
  );

  const shell: ViewStyle = {
    height: s.height,
    paddingHorizontal: s.paddingHorizontal,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
    opacity: isDisabled ? 0.55 : 1,
    overflow: 'hidden',
  };

  return (
    <AnimatedPressable onPress={onPress} disabled={isDisabled} scaleDown={0.96} style={style}>
      {variant === 'primary' ? (
        <LinearGradient
          colors={isDisabled ? [c.track, c.track] : [c.violet, c.violetDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={shell}>
          {body}
        </LinearGradient>
      ) : (
        <View
          style={[
            shell,
            {
              backgroundColor: variant === 'ghost' ? 'transparent' : c.panel,
              borderWidth: variant === 'ghost' ? 0 : 1,
              borderColor: variant === 'danger' ? 'rgba(240,97,109,0.35)' : c.panelBorder,
            },
          ]}>
          {body}
        </View>
      )}
    </AnimatedPressable>
  );
};

/**
 * @deprecated Targeting-reticle corner marks. Read as sci-fi HUD rather than
 * crystalline, so they were pulled from the auth panels. Kept only so existing
 * imports don't break — don't add new call sites.
 */
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
          borderRadius: RADIUS.md,
          borderWidth: 1,
          borderColor: c.panelBorder,
          overflow: 'hidden',
        },
        style,
      ]}>
      {accentEdge && (
        <LinearGradient
          pointerEvents="none"
          colors={[c.violet, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2 }}
        />
      )}
      {children}
      {brackets && <CornerBrackets color={bracketColor ?? c.panelBorderStrong} />}
    </View>
  );
};

/** Crystal progress bar — rounded track, violet→cyan fill. */
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
    <View style={[{ height, backgroundColor: c.track, borderRadius: height / 2, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={[c.violet, c.cyan]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct * 100}%`, borderRadius: height / 2 }}
      />
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
          borderRadius: 14,
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

/**
 * Shimmering placeholder block for loading states — same track color and radius
 * scale as everything else, so a skeleton reads as "this panel, not yet filled"
 * rather than a generic gray box.
 */
export const HudSkeleton = ({
  width,
  height,
  radius = RADIUS.xs,
  isDark,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  isDark: boolean;
  style?: StyleProp<ViewStyle>;
}) => {
  const c = hud(isDark);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0.85, { duration: 750 }), withTiming(0.4, { duration: 750 })), -1, true);
  }, [opacity]);

  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius: radius, backgroundColor: c.track }, anim, style]}
    />
  );
};

/** The SH▲RD wordmark. */
export const WordMark = ({ size = 26, color, accent }: { size?: number; color?: string; accent?: string }) => (
  <Text style={{ fontFamily: FONT.black, fontSize: size, letterSpacing: size * 0.14, color: color ?? '#F3F2F8' }}>
    SH<Text style={{ color: accent ?? '#8B5CF6' }}>▲</Text>RD
  </Text>
);
