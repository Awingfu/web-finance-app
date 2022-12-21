import React from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

interface TooltipOnHoverProps {
  text: string;
  nest: any;
}

interface TooltipProps {
  text: string;
}

// Tooltips
const tooltip_show_delay = 700;
const tooltip_hide_delay = 200;
const renderTooltip = (props: TooltipProps) => (
  <Tooltip id="button-tooltip" {...props}>
    {props.text}
  </Tooltip>
);

/**
 * This React component wraps any JSX with an OverlayTrigger (Tooltip on Hover)
 * @param props props.text should contain tooltip text, props.nest should contain nested JSX
 * @returns Tooltip on Hover around nested JSX
 */
const TooltipOnHover = (props: TooltipOnHoverProps) => {
  return (
    <OverlayTrigger
      placement="bottom"
      delay={{ show: tooltip_show_delay, hide: tooltip_hide_delay }}
      overlay={renderTooltip({ text: props.text })}
    >
      {props.nest}
    </OverlayTrigger>
  );
};

export default TooltipOnHover;
