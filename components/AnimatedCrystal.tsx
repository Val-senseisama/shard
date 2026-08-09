import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import Svg, { Path, Defs, LinearGradient, Stop, RadialGradient } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useReducedMotion } from '~/helpers/motion';

const AnimatedCrystal = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  const reduced = useReducedMotion();

  useEffect(() => {
    // A continuous float is decorative; someone who asked for less motion should
    // get a still crystal, not a gently bobbing one.
    if (reduced) {
      cancelAnimation(translateY);
      translateY.value = 0;
      rotate.value = 0;
      return;
    }
    translateY.value = withRepeat(
      withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    rotate.value = 0;
  }, [reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  // Crystal geometry:
  // Pointed top, widens through angled facets in the upper third,
  // broadest around 40-60%, then tapers to a chiseled bottom point.
  // Asymmetric facet edges give it a natural raw-crystal feel.

  return (
    <View style={{ width: 140, height: 200, alignItems: 'center', justifyContent: 'center' }}>
      {/* Diffuse glow behind crystal */}
      <View style={{ position: 'absolute' }}>
        <Svg width={180} height={220} viewBox="0 0 180 220">
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor="#8b5cf6" stopOpacity={isDark ? 0.5 : 0.3} />
              <Stop offset="0.6" stopColor="#8b5cf6" stopOpacity={isDark ? 0.15 : 0.08} />
              <Stop offset="1" stopColor="#8b5cf6" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Path d="M0 0 H180 V220 H0 Z" fill="url(#glow)" />
        </Svg>
      </View>
      <Animated.View style={animatedStyle}>
        <Svg width={90} height={170} viewBox="0 0 90 170">
          <Defs>
            {/* Main body gradient — top-to-bottom */}
            <LinearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#d8b4fe" />
              <Stop offset="0.35" stopColor="#a78bfa" />
              <Stop offset="0.65" stopColor="#7c3aed" />
              <Stop offset="1" stopColor="#4c1d95" />
            </LinearGradient>
            {/* Left face — lighter/highlight */}
            <LinearGradient id="leftFace" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#e9d5ff" />
              <Stop offset="0.5" stopColor="#c084fc" />
              <Stop offset="1" stopColor="#7c3aed" />
            </LinearGradient>
            {/* Right face — darker */}
            <LinearGradient id="rightFace" x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#a78bfa" />
              <Stop offset="0.5" stopColor="#6d28d9" />
              <Stop offset="1" stopColor="#3b0764" />
            </LinearGradient>
            {/* Center front face */}
            <LinearGradient id="centerFace" x1="0.5" y1="0" x2="0.5" y2="1">
              <Stop offset="0" stopColor="#c4b5fd" />
              <Stop offset="0.4" stopColor="#8b5cf6" />
              <Stop offset="1" stopColor="#5b21b6" />
            </LinearGradient>
            {/* Bright highlight for top facet */}
            <LinearGradient id="topHighlight" x1="0" y1="0" x2="0.5" y2="1">
              <Stop offset="0" stopColor="#ede9fe" />
              <Stop offset="1" stopColor="#a78bfa" />
            </LinearGradient>
          </Defs>

          {/*
            Crystal outline points (roughly):
            Top point:        (42, 0)
            Upper-left:       (22, 32)
            Upper-right:      (58, 28)
            Far-right bulge:  (68, 55)
            Mid-right:        (65, 95)
            Lower-right:      (58, 130)
            Bottom point:     (40, 170)
            Lower-left:       (28, 135)
            Mid-left:         (20, 100)
            Far-left bulge:   (15, 60)
            Center ridge runs from top (42,0) down through ~(38,80) to bottom (40,170)
          */}

          {/* LEFT FACE — bright/highlight side */}
          <Path
            d="M42 0 L22 32 L15 60 L20 100 L28 135 L40 170 L38 80 Z"
            fill="url(#leftFace)"
            opacity={0.95}
          />

          {/* RIGHT FACE — darker shadow side */}
          <Path
            d="M42 0 L58 28 L68 55 L65 95 L58 130 L40 170 L38 80 Z"
            fill="url(#rightFace)"
            opacity={0.92}
          />

          {/* CENTER-LEFT sub-facet — adds depth */}
          <Path
            d="M42 0 L22 32 L15 60 L38 80 Z"
            fill="url(#topHighlight)"
            opacity={0.55}
          />

          {/* CENTER-RIGHT upper sub-facet */}
          <Path
            d="M42 0 L58 28 L68 55 L38 80 Z"
            fill="url(#centerFace)"
            opacity={0.45}
          />

          {/* Lower-left inner facet */}
          <Path
            d="M38 80 L15 60 L20 100 L28 135 L40 170 Z"
            fill="url(#centerFace)"
            opacity={0.3}
          />

          {/* Lower-right inner facet — darkest */}
          <Path
            d="M38 80 L68 55 L65 95 L58 130 L40 170 Z"
            fill="#4c1d95"
            opacity={0.25}
          />

          {/* Top cap highlight — bright gem flash */}
          <Path
            d="M42 0 L22 32 L38 40 Z"
            fill="#ede9fe"
            opacity={0.6}
          />
          <Path
            d="M42 0 L58 28 L38 40 Z"
            fill="#c4b5fd"
            opacity={0.4}
          />

          {/* Edge highlights — facet borders */}
          {/* Center ridge */}
          <Path d="M42 0 L38 80 L40 170" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
          {/* Left edge */}
          <Path d="M22 32 L15 60 L20 100 L28 135" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
          {/* Right edge */}
          <Path d="M58 28 L68 55 L65 95 L58 130" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          {/* Mid horizontal facet line */}
          <Path d="M15 60 L38 80 L68 55" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" />
          {/* Top facet lines */}
          <Path d="M22 32 L38 40 L58 28" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        </Svg>
      </Animated.View>
    </View>
  );
};

export default AnimatedCrystal;
