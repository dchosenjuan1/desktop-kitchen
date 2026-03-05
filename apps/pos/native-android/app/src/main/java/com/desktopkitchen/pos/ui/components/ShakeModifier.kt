package com.desktopkitchen.pos.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.graphics.graphicsLayer

fun Modifier.shake(enabled: Boolean): Modifier = composed {
    val offset = remember { Animatable(0f) }

    LaunchedEffect(enabled) {
        if (enabled) {
            for (i in 0..2) {
                offset.animateTo(10f, animationSpec = spring(stiffness = Spring.StiffnessHigh))
                offset.animateTo(-10f, animationSpec = spring(stiffness = Spring.StiffnessHigh))
            }
            offset.animateTo(0f, animationSpec = spring(stiffness = Spring.StiffnessHigh))
        }
    }

    graphicsLayer { translationX = offset.value }
}
