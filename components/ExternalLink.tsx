import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Platform, TouchableOpacity } from "react-native";

export function ExternalLink(
  props: Omit<React.ComponentProps<typeof Link>, "href"> & { href: string }
) {
  // Ensure we don't pass React Native style objects directly to the DOM <a>
  const { style, children, href, ...rest } = props as any;

  return (
    <Link target="_blank" href={href} {...rest} asChild>
      <TouchableOpacity
        style={style}
        onPress={(e) => {
          if (Platform.OS !== "web") {
            e.preventDefault();
            WebBrowser.openBrowserAsync(href as string);
          }
        }}
      >
        {children}
      </TouchableOpacity>
    </Link>
  );
}
