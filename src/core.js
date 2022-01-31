// CORE
import fs from "@skpm/fs";
import getParsedContent from "./parse-layers/parse";

const UI = require("sketch/ui");
const sketchDom = require("sketch/dom");

let pageLayers = [];
let selectedArtboard;
let previewOnline;

// exportTo
const exportTo = (context, fileType, fileMarkup) => {
  const document = sketchDom.fromNative(context.document);
  const page = document.selectedPage;
  pageLayers = page.layers;

  // get current artboards in page selected
  let artboards = [];

  pageLayers.map(layer => {
    if (layer.type === "Artboard") {
      artboards.push(layer.name);
    }
  });

  // create save file dialog
  const runSaveFileDialog = (pageLayers, artboard, previewOnline) => {
    // create instance
    const savePanel = NSSavePanel.savePanel();
    savePanel.allowedFileTypes = [`${fileType}`];

    // launch dialog
    const resultSaveDialog = savePanel.runModal();
    // result
    if (resultSaveDialog == NSFileHandlingPanelOKButton) {
      const file = `${savePanel.nameFieldStringValue()}.${fileType}`;
      const directoryPath = savePanel
        .URL()
        .path()
        .replace(file, ""); // remove file to get only directory
      try {
        parseContent(pageLayers, artboard, directoryPath, file)
      } catch (err) {
        UI.alert("❌", `Something went wrong - ${err}.`);
      }
    }
  };

  //create sketch export modal icon
  const createPluginModalIcon = () => {
    const exportModalIconPath = context.plugin
      .urlForResourceNamed("icon.png")
      .path();
    return NSImage.alloc().initByReferencingFile(exportModalIconPath);
  };

  // create export modal
  const runExportModal = (pageLayers, artboards) => {
    const exportModal = COSAlertWindow.new();
    exportModal.setMessageText(`Export to ${fileMarkup}`);
    exportModal.setIcon(createPluginModalIcon());

    // adding the main cta's
    exportModal.addButtonWithTitle("OK");
    exportModal.addButtonWithTitle("Cancel");

    // Creating the view
    const viewWidth = 300;
    const viewHeight = 130;
    const view = NSView.alloc().initWithFrame(
      NSMakeRect(0, 0, viewWidth, viewHeight)
    );
    exportModal.addAccessoryView(view);

    // Create Dropdown artboards
    const dropdownArtboardLabel = NSTextField.alloc().initWithFrame(
      NSMakeRect(0, 110, viewWidth, 22)
    );
    dropdownArtboardLabel.setStringValue("Select an artboard");
    dropdownArtboardLabel.editable = false;
    dropdownArtboardLabel.selectable = false;
    dropdownArtboardLabel.bezeled = false;
    dropdownArtboardLabel.drawsBackground = false;

    const dropdownArtboards = NSPopUpButton.alloc().initWithFrame(
      NSMakeRect(0, 80, viewWidth / 2, 22)
    );
    artboards.map(artboard => {
      dropdownArtboards.addItemWithTitle(artboard);
    });

    view.addSubview(dropdownArtboardLabel);
    view.addSubview(dropdownArtboards);

    const resultExportModal = exportModal.runModal();
    if (resultExportModal != "1000") {
      return;
    } else {
      // save selected artboard
      selectedArtboard = artboards[dropdownArtboards.indexOfSelectedItem()];
      runSaveFileDialog(pageLayers, selectedArtboard, 0);
    }
  };

  // parse content either for md or json
  const parseContent = async (pageLayers, artboard, directoryPath, file) => {
    const content = await getParsedContent(
      pageLayers,
      artboard,
      directoryPath,
      fileType
    );

    await saveContentToFile(directoryPath, file, content);
    UI.alert(
      "Export complete.",
      `🎉🎉 ${artboard} was successfully exported to ${fileMarkup}.`
    );
    return content;
  };

  // save content to file
  const saveContentToFile = (path, file, content) => {

    fs.writeFileSync(`${path}/${file}`, content, "utf8");
  };

  // create preview online modal
  const runPreviewOnlineModal = url => {
    const previewModal = COSAlertWindow.new();
    previewModal.setMessageText(`Preview ${fileMarkup} online`);
    previewModal.setIcon(createPluginModalIcon());

    // adding the main cta's
    previewModal.addButtonWithTitle("Go");
    previewModal.addButtonWithTitle("Cancel");

    // Creating the view
    const viewWidth = 300;
    const view = NSView.alloc().initWithFrame(NSMakeRect(0, 0, viewWidth, 0));
    previewModal.addAccessoryView(view);

    const resultPreviewModal = previewModal.runModal();
    if (resultPreviewModal != "1000") {
      return;
    } else {
      let viewerURL;
      if (fileType === "md") {
        viewerURL = "https://stackedit.io/viewer#!url=";
      } else if (fileType === "json") {
        viewerURL = "https://jsoneditoronline.org/?url=";
      }
      // open link
      NSWorkspace.sharedWorkspace().openURL(
        NSURL.URLWithString(`${viewerURL}${url}`)
      );
    }
  };



  // select at least one artboard
  if (artboards.length === 0) {
    UI.message("❌ You have no artboards in your page. You need at least one.");
  } else {
    runExportModal(pageLayers, artboards.reverse(), fileMarkup, fileType);
  }
};

export default exportTo;
