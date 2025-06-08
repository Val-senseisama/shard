import React from 'react';
import { View } from 'react-native';

const CrystalShape = ({color}: {color: string}) => {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 2 }}>
      <View style={{ height: 16, flexDirection: 'column' }}>
        {/* Top pointy part (triangle) */}
        <View 
          style={{
            width: 0,
            height: 0,
            backgroundColor: 'transparent',
            borderStyle: 'solid',
            borderLeftWidth: 6,
            borderRightWidth: 6,
            borderBottomWidth: 4,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
          }}
        />
        
        {/* Upper middle part (trapezoid) */}
        <View 
          style={{
            width: 12,
            height: 6,
            backgroundColor: color,
            borderTopWidth: 0,
            borderBottomWidth: 0,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: color,
            borderStyle: 'solid',
          }}
        />
        
        {/* Lower middle part (trapezoid) */}
        <View 
          style={{
            width: 12,
            height: 6,
            backgroundColor: color,
            borderTopWidth: 0,
            borderBottomWidth: 0,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor:  color,
            borderStyle: 'solid',
          }}
        />
        
        {/* Bottom pointy part (triangle) */}
        <View 
          style={{
            width: 0,
            height: 0,
            backgroundColor: 'transparent',
            borderStyle: 'solid',
            borderLeftWidth: 6,
            borderRightWidth: 6,
            borderTopWidth: 4,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: color,
          }}
        />
      </View>
    </View>
  );
};

export default CrystalShape;